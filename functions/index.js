
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { onSchedule } = require("firebase-functions/v2/scheduler");

admin.initializeApp();

const db = admin.firestore();
const resendApiKey = defineSecret("RESEND_API_KEY");
const SENDER_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Clinic@Click <hello@mail.clinicatclick.com>";

function getResend() {
  const key = resendApiKey.value();
  if (!key) {
    throw new Error(
      "RESEND_API_KEY secret is not set. Run 'firebase functions:secrets:set RESEND_API_KEY'."
    );
  }
  return new Resend(key);
}

// 1. Existing function: notify clinic admins about join requests.
exports.onNewJoinRequest = onDocumentCreated(
  {
    document: "clinics/{clinicId}/pendingRequests/{userId}",
    region: "us-central1",
  },
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
  { secrets: [resendApiKey], region: "us-central1" },
  async (request) => {
    const email = request.auth?.token?.email;

    if (!email) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in with Clinic@Click first."
      );
    }

    const { data, error } = await getResend().emails.send({
      from: SENDER_EMAIL,
      to: [email],
      subject: "Clinic@Click email test",
      html: `
        <h2>Email setup successful</h2>
        <p>Clinic@Click can now send emails through Resend.</p>
        <p><a href="https://clinicatclick.com">Open Clinic@Click</a></p>
      `,
    });

    if (error) {
      console.error("Resend test-email error:", error.message || error);
      throw new HttpsError(
        "internal",
        `Unable to send test email: ${error.message || "Unknown error"}`
      );
    }

    return { success: true, id: data?.id };
  }
);

// 3. New function: send a welcome email when a user profile is created.
exports.sendWelcomeEmail = onDocumentCreated(
  {
    document: "users/{userId}",
    secrets: [resendApiKey],
    region: "us-central1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const user = snapshot.data();
    const userId = event.params.userId;

    if (!user.email) {
      console.log("New user has no email:", userId);
      return;
    }

    // Claim this email before sending, to reduce duplicate sends on retries.
    const statusRef = db
      .collection("emailLogs")
      .doc(`welcome_${userId}`);

    try {
      await db.runTransaction(async (transaction) => {
        const status = await transaction.get(statusRef);

        if (status.exists) {
          const statusData = status.data();
          if (statusData.status === "sent") {
            throw new Error("WELCOME_EMAIL_ALREADY_SENT");
          }
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          const createdAtMs = statusData.createdAt?.toMillis
            ? statusData.createdAt.toMillis()
            : 0;
          if (statusData.status === "sending" && createdAtMs > tenMinutesAgo) {
            throw new Error("WELCOME_EMAIL_IN_PROGRESS");
          }
        }

        transaction.set(
          statusRef,
          {
            type: "welcome",
            userId,
            recipientEmail: user.email,
            status: "sending",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (error) {
      if (
        error.message === "WELCOME_EMAIL_ALREADY_SENT" ||
        error.message === "WELCOME_EMAIL_IN_PROGRESS"
      ) {
        console.log(`Welcome email for ${userId}: ${error.message}`);
        return;
      }
      throw error;
    }

    try {
      const firstName =
        typeof user.displayName === "string" && user.displayName.trim()
          ? user.displayName.trim().split(/\s+/)[0]
          : "Doctor";

      const { data, error } = await getResend().emails.send({
        from: SENDER_EMAIL,
        to: [user.email],
        subject: "Welcome to Clinic@Click!",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;line-height:1.6">
            <h2>Welcome to Clinic@Click, ${firstName}!</h2>
            <p>We're glad you're here.</p>
            <p>Get started by exploring your clinic dashboard and setting up your workspace to manage appointments, dental charts, and patient records.</p>
            <p style="margin:24px 0">
              <a href="https://clinicatclick.com"
                 style="background:#256AF3;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">
                Open Clinic@Click
              </a>
            </p>
            <p>If you need help or have questions, reply to this email.</p>
            <p>Warm regards,<br><strong>Team Clinic@Click</strong><br>
            <span style="color:#666">Modern Dentistry Starts Here.</span></p>
          </div>
        `,
      });

      if (error) {
        await statusRef.update({
          status: "failed",
          error: String(error.message || JSON.stringify(error)).slice(0, 500),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.error("Welcome email failed for", userId, ":", error.message || error);
        throw new Error(`Resend failed to send welcome email: ${error.message}`);
      }

      await statusRef.update({
        status: "sent",
        resendId: data?.id || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("Welcome email sent to:", user.email, "Resend ID:", data?.id);
    } catch (error) {
      console.error("Welcome email processing failed for", userId, ":", error);
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
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Fetch users without clinic; filter createdAt <= cutoffDate in-memory to prevent composite index errors
    const usersSnapshot = await db
      .collection("users")
      .where("clinicId", "==", null)
      .get();

    const eligibleDocs = usersSnapshot.docs.filter((doc) => {
      const data = doc.data();
      if (!data.createdAt) return false;
      const createdDate = data.createdAt.toDate
        ? data.createdAt.toDate()
        : new Date(data.createdAt);
      return createdDate <= cutoffDate;
    });

    console.log(
      `Found ${eligibleDocs.length} users with incomplete setup candidates (of ${usersSnapshot.size} total users with clinicId == null).`
    );

    for (const userDoc of eligibleDocs) {
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

        if (existing.exists) {
          const existingData = existing.data();
          if (existingData.status === "sent") {
            return false;
          }
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          const updatedAtMs = existingData.updatedAt?.toMillis
            ? existingData.updatedAt.toMillis()
            : 0;
          if (existingData.status === "sending" && updatedAtMs > tenMinutesAgo) {
            return false;
          }
        }

        transaction.set(
          logRef,
          {
            type: "setup_reminder",
            userId,
            recipientEmail: user.email,
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
          from: SENDER_EMAIL,
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
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log("Setup reminder sent to:", user.email, "Resend ID:", data?.id);
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

/**
 * 5. Admin-only function: manually send a welcome email.
 */
exports.sendManualWelcomeEmail = onCall(
  {
    secrets: [resendApiKey],
    region: "us-central1",
  },
  async (request) => {
    // Require authentication.
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Please sign in first."
      );
    }

    // Verify that the caller is an admin or owner.
    const adminDoc = await db
      .collection("users")
      .doc(request.auth.uid)
      .get();

    const callerRole = adminDoc.data()?.role;
    if (!adminDoc.exists || (callerRole !== "admin" && callerRole !== "owner")) {
      throw new HttpsError(
        "permission-denied",
        "Only clinic administrators can send manual welcome emails."
      );
    }

    // Accept a Firebase Authentication UID, not an arbitrary email.
    const targetUid = request.data?.targetUid;

    if (
      typeof targetUid !== "string" ||
      !targetUid.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        "A valid recipient user ID is required."
      );
    }

    let targetUser;

    try {
      targetUser = await admin.auth().getUser(targetUid.trim());
    } catch (error) {
      throw new HttpsError(
        "not-found",
        "The recipient was not found in Firebase Authentication."
      );
    }

    const recipientEmail = targetUser.email;

    if (!recipientEmail) {
      throw new HttpsError(
        "failed-precondition",
        "The recipient does not have an email address."
      );
    }

    const logRef = db.collection("emailLogs").doc();

    await logRef.set({
      type: "manual_welcome",
      targetUid,
      recipientEmail,
      requestedBy: request.auth.uid,
      status: "sending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      const { data, error } = await getResend().emails.send({
        from: SENDER_EMAIL,
        to: [recipientEmail],
        subject: "Welcome to Clinic@Click",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#333;line-height:1.6">
            <h2>Welcome to Clinic@Click!</h2>
            <p>We're glad you're here.</p>
            <p>Get started by exploring your clinic dashboard and the tools designed to make managing your dental practice easier.</p>
            <p><a href="https://clinicatclick.com"
              style="background:#256AF3;color:white;padding:12px 20px;text-decoration:none;border-radius:8px;display:inline-block">
              Open Clinic@Click
            </a></p>
            <p>If you need any assistance, simply reply to this email. Our team will be happy to help.</p>
            <p>Regards,<br><strong>Team Clinic@Click</strong><br>
            Modern Dentistry Starts Here.</p>
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

      console.log("Manual welcome email sent:", recipientEmail, "Resend ID:", data?.id);

      return {
        success: true,
        recipient: recipientEmail,
        resendId: data?.id || null,
      };
    } catch (error) {
      await logRef.update({
        status: "failed",
        error: String(error.message || error).slice(0, 500),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.error("Manual welcome email failed:", error);

      throw new HttpsError(
        "internal",
        `Failed to send welcome email: ${error.message || "Unknown error"}. Check Resend domain verification and API key.`
      );
    }
  }
);

/**
 * 7. Scheduled: delete stale unverified email/password accounts after 48 hours.
 *
 * Safety guarantees:
 *   - Only removes users whose email is NOT verified.
 *   - Only removes users who signed up with email/password (providerId === 'password').
 *   - Only removes users whose account was created more than 48 hours ago.
 *   - NEVER removes an account that has a clinicId set in Firestore (they have live data).
 *   - Deletes the Firestore user profile document only if it also has no clinicId.
 *
 * Runs daily at 2:00 AM India Standard Time.
 */
exports.deleteStaleUnverifiedUsers = onSchedule(
  {
    schedule: "0 2 * * *",
    timeZone: "Asia/Kolkata",
    region: "us-central1",
  },
  async () => {
    const cutoffMs = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago
    let deletedCount = 0;
    let skippedCount = 0;
    let pageToken;

    console.log(
      `deleteStaleUnverifiedUsers: scanning for unverified accounts created before ${new Date(cutoffMs).toISOString()}`
    );

    // Paginate through all Firebase Auth users
    do {
      const listResult = await admin.auth().listUsers(1000, pageToken);
      pageToken = listResult.pageToken;

      for (const authUser of listResult.users) {
        // Guard 1: must NOT be verified
        if (authUser.emailVerified) {
          continue;
        }

        // Guard 2: must be email/password provider only
        const isPasswordUser = authUser.providerData.some(
          (p) => p.providerId === "password"
        );
        if (!isPasswordUser) {
          continue;
        }

        // Guard 3: account must be older than 48 hours
        const creationMs = authUser.metadata.creationTime
          ? new Date(authUser.metadata.creationTime).getTime()
          : 0;

        if (creationMs > cutoffMs) {
          continue; // too recent — still within grace period
        }

        // Guard 4: check Firestore profile — never delete if clinicId is set
        const uid = authUser.uid;
        try {
          const profileSnap = await db.collection("users").doc(uid).get();

          if (profileSnap.exists) {
            const profileData = profileSnap.data();
            if (profileData.clinicId) {
              // User has clinic data — do not delete under any circumstances
              console.log(
                `deleteStaleUnverifiedUsers: skipping uid=${uid} — has clinicId`
              );
              skippedCount++;
              continue;
            }
          }

          // Safe to delete — no clinic association
          // 1. Delete Firestore profile (and sub-collections are cleaned up by the
          //    Firebase console / extension; we only delete the root doc here to
          //    avoid the Extension SDK dependency in this function)
          if (profileSnap.exists) {
            await db.collection("users").doc(uid).delete();
            console.log(`deleteStaleUnverifiedUsers: deleted Firestore doc for uid=${uid}`);
          }

          // 2. Delete the Firebase Auth user record
          await admin.auth().deleteUser(uid);
          console.log(
            `deleteStaleUnverifiedUsers: deleted Auth user uid=${uid} email=${authUser.email || "no-email"}`
          );

          deletedCount++;
        } catch (err) {
          console.error(
            `deleteStaleUnverifiedUsers: error processing uid=${uid}:`,
            err.message || err
          );
          // Continue processing other users even if one fails
        }
      }
    } while (pageToken);

    console.log(
      `deleteStaleUnverifiedUsers: completed — deleted=${deletedCount}, skipped=${skippedCount}`
    );
  }
);

/**
 * 6. Admin-only function: Audit and repair incomplete user profiles.
 * Scans all Firestore users and backfills missing email, displayName, photoURL,
 * clinicId (default null), role (default null), and notificationsEnabled from Firebase Auth.
 * NEVER overwrites existing clinic memberships or user data.
 */
exports.repairUserProfiles = onCall(
  {
    region: "us-central1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Please sign in first.");
    }

    const adminDoc = await db.collection("users").doc(request.auth.uid).get();
    const callerRole = adminDoc.data()?.role;
    if (!adminDoc.exists || (callerRole !== "admin" && callerRole !== "owner")) {
      throw new HttpsError(
        "permission-denied",
        "Only clinic administrators can run profile audits and repairs."
      );
    }

    const usersSnap = await db.collection("users").get();
    let scannedCount = 0;
    let repairedCount = 0;
    const details = [];

    for (const docSnap of usersSnap.docs) {
      scannedCount++;
      const data = docSnap.data();
      const uid = docSnap.id;
      const updates = {};
      const missingFields = [];

      let authUser = null;
      try {
        authUser = await admin.auth().getUser(uid);
      } catch (err) {
        console.warn(`Auth record not found for uid ${uid}:`, err.message);
      }

      // 1. UID
      if (!data.uid) {
        updates.uid = uid;
        missingFields.push("uid");
      }

      // 2. Email (repaired from Firebase Auth)
      if ((!data.email || data.email === null) && authUser?.email) {
        updates.email = authUser.email;
        missingFields.push("email");
      }

      // 3. Display Name (repaired from Firebase Auth if missing)
      if ((!data.displayName || data.displayName === null) && authUser?.displayName) {
        updates.displayName = authUser.displayName;
        missingFields.push("displayName");
      }

      // 4. Photo URL (repaired from Firebase Auth if missing)
      if ((!data.photoURL || data.photoURL === null) && authUser?.photoURL) {
        updates.photoURL = authUser.photoURL;
        missingFields.push("photoURL");
      }

      // 5. Clinic ID (default null for solo users, preserve existing)
      if (data.clinicId === undefined) {
        updates.clinicId = null;
        missingFields.push("clinicId");
      }

      // 6. Role (default null for solo users, preserve existing)
      if (data.role === undefined) {
        updates.role = null;
        missingFields.push("role");
      }

      // 7. Notifications Enabled
      if (typeof data.notificationsEnabled !== "boolean") {
        updates.notificationsEnabled = true;
        missingFields.push("notificationsEnabled");
      }

      // 8. Timestamps
      if (!data.createdAt) {
        const creationTime = authUser?.metadata?.creationTime
          ? admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime))
          : admin.firestore.FieldValue.serverTimestamp();
        updates.createdAt = creationTime;
        missingFields.push("createdAt");
      }

      if (!data.lastActiveAt && authUser?.metadata?.lastSignInTime) {
        updates.lastActiveAt = admin.firestore.Timestamp.fromDate(
          new Date(authUser.metadata.lastSignInTime)
        );
        missingFields.push("lastActiveAt");
      }

      // Apply updates safely with merge: true
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection("users").doc(uid).set(updates, { merge: true });
        repairedCount++;
        details.push({
          uid,
          email: updates.email || data.email || authUser?.email || null,
          repairedFields: missingFields,
        });
      }
    }

    console.log(`Profile repair completed: ${repairedCount} of ${scannedCount} users repaired.`);

    return {
      success: true,
      scannedCount,
      repairedCount,
      details,
    };
  }
);

