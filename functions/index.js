
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();
const resendApiKey = defineSecret("RESEND_API_KEY");

function getResend() {
  return new Resend(resendApiKey.value());
}

// 1. Existing function: notify clinic admins about join requests.
exports.onNewJoinRequest = onDocumentCreated(
  "clinics/{clinicId}/pendingRequests/{userId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const requestData = snapshot.data();
    const clinicId = event.params.clinicId;
    const userName = requestData.displayName || "A new user";

    try {
      const adminsSnapshot = await db
        .collection("users")
        .where("clinicId", "==", clinicId)
        .where("role", "==", "admin")
        .get();

      if (adminsSnapshot.empty) {
        console.log(`No admins found for clinic ${clinicId}`);
        return;
      }

      let tokens = [];

      adminsSnapshot.forEach((doc) => {
        const userData = doc.data();

        if (Array.isArray(userData.fcmTokens)) {
          tokens = tokens.concat(userData.fcmTokens);
        } else if (userData.fcmToken) {
          tokens.push(userData.fcmToken);
        }
      });

      tokens = [...new Set(tokens)];

      if (tokens.length === 0) {
        console.log("No FCM tokens found for clinic admins.");
        return;
      }

      const response = await admin.messaging().sendEachForMulticast({
        notification: {
          title: "New Join Request",
          body: `${userName} has requested to join your clinic.`,
        },
        tokens,
      });

      console.log(
        `Join-request notifications: ${response.successCount} sent, ` +
        `${response.failureCount} failed.`
      );
    } catch (error) {
      console.error("Error sending join-request notifications:", error);
      throw error;
    }
  }
);

// 2. Existing function: send a test email to the signed-in user.
exports.sendTestEmail = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    const email = request.auth?.token?.email;

    if (!email) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in with Clinic@Click first."
      );
    }

    const { data, error } = await getResend().emails.send({
      from: "Clinic@Click <hello@mail.clinicatclick.com>",
      to: [email],
      subject: "Clinic@Click email test",
      html: `
        <h2>Email setup successful</h2>
        <p>Clinic@Click can now send emails through Resend.</p>
        <p><a href="https://clinicatclick.com">Open Clinic@Click</a></p>
      `,
    });

    if (error) {
      console.error("Resend test-email error:", error.message);
      throw new HttpsError("internal", "Unable to send test email.");
    }

    return { success: true, id: data?.id };
  }
);

// 3. New function: send a welcome email when a user profile is created.
exports.sendWelcomeEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const user = snapshot.data();

    if (!user.email) {
      console.log("New user has no email:", event.params.userId);
      return;
    }

    // Claim this email before sending, to reduce duplicate sends on retries.
    const statusRef = db
      .collection("emailLogs")
      .doc(`welcome_${event.params.userId}`);

    try {
      await db.runTransaction(async (transaction) => {
        const status = await transaction.get(statusRef);

        if (status.exists) {
          throw new Error("WELCOME_EMAIL_ALREADY_PROCESSED");
        }

        transaction.create(statusRef, {
          type: "welcome",
          userId: event.params.userId,
          status: "sending",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      if (error.message === "WELCOME_EMAIL_ALREADY_PROCESSED") {
        console.log("Welcome email already processed:", event.params.userId);
        return;
      }
      throw error;
    }

    try {
      const { data, error } = await getResend().emails.send({
        from: "Clinic@Click <hello@mail.clinicatclick.com>",
        to: [user.email],
        subject: "Welcome to Clinic@Click",
        html: `
          <h2>Welcome to Clinic@Click!</h2>
          <p>We're glad you're here.</p>
          <p>Get started by signing in and setting up your clinic.</p>
          <p><a href="https://clinicatclick.com">Open Clinic@Click</a></p>
          <p>If you need help, reply to this email.</p>
          <p>— Team Clinic@Click</p>
        `,
      });

      if (error) {
        await statusRef.update({
          status: "failed",
          error: error.message,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.error("Welcome email failed:", error.message);
        throw new Error("Resend failed to send welcome email");
      }

      await statusRef.update({
        status: "sent",
        resendId: data?.id || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Welcome email sent:", data?.id);
    } catch (error) {
      console.error("Welcome email processing failed:", error);
      throw error;
    }
  }
);


/**
 * 4. Send an incomplete-setup reminder 48+ hours after signup.
 * Runs daily at 10:00 AM India time.
 */
exports.sendSetupReminder = onSchedule(
  {
    schedule: "0 10 * * *",
    timeZone: "Asia/Kolkata",
    region: "us-central1",
    secrets: [resendApiKey],
  },
  async () => {
    const cutoff = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 48 * 60 * 60 * 1000)
    );

    const usersSnapshot = await db
      .collection("users")
      .where("clinicId", "==", null)
      .where("createdAt", "<=", cutoff)
      .get();

    console.log(
      `Found ${usersSnapshot.size} users with incomplete setup candidates.`
    );

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;

      if (!user.email) {
        console.log("Skipping user without email:", userId);
        continue;
      }

      const logRef = db
        .collection("emailLogs")
        .doc(`setup_reminder_${userId}`);

      // Skip reminders already sent or currently being processed.
      const shouldSend = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(logRef);

        if (
          existing.exists &&
          ["sent", "sending"].includes(existing.data().status)
        ) {
          return false;
        }

        transaction.set(
          logRef,
          {
            type: "setup_reminder",
            userId,
            status: "sending",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        return true;
      });

      if (!shouldSend) {
        continue;
      }

      try {
        const firstName =
          typeof user.displayName === "string" &&
          user.displayName.trim()
            ? user.displayName.trim().split(/\s+/)[0]
            : "Doctor";

        const { data, error } = await getResend().emails.send({
          from: "Clinic@Click <hello@mail.clinicatclick.com>",
          to: [user.email],
          subject: "Your Clinic@Click setup is waiting for you",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;line-height:1.6">
              <h2>You're a few steps away, ${firstName}.</h2>
              <p>Complete your Clinic@Click setup to get started with tools designed for your dental practice.</p>
              <ul>
                <li>Manage patient records and appointments</li>
                <li>Maintain digital dental charts and treatment records</li>
                <li>Keep track of billing and clinic operations</li>
              </ul>
              <p style="margin:28px 0">
                <a href="https://clinicatclick.com"
                   style="background:#256AF3;color:#fff;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">
                  Complete Your Setup
                </a>
              </p>
              <p>If you ran into an issue or need help, simply reply to this email.</p>
              <p>Regards,<br><strong>Team Clinic@Click</strong><br>
              <span style="color:#666">Modern Dentistry Starts Here.</span></p>
            </div>
          `,
        });

        if (error) {
          throw new Error(error.message);
        }

        await logRef.update({
          status: "sent",
          resendId: data?.id || null,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Setup reminder sent to:", user.email);
      } catch (error) {
        await logRef.update({
          status: "failed",
          error: String(error.message || error).slice(0, 500),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.error(
          "Setup reminder failed for",
          userId,
          error.message || error
        );
      }
    }
  }
);
