
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");

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
