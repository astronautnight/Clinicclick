const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.onNewJoinRequest = onDocumentCreated("clinics/{clinicId}/pendingRequests/{userId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const requestData = snapshot.data();
  const clinicId = event.params.clinicId;
  const userName = requestData.displayName || "A new user";

  console.log(`New join request for clinic ${clinicId} from user ${userName}`);

  try {
    // 1. Find all admins for this clinic
    const adminsSnapshot = await db.collection("users")
      .where("clinicId", "==", clinicId)
      .where("role", "==", "admin")
      .get();

    if (adminsSnapshot.empty) {
      console.log(`No admins found for clinic ${clinicId}`);
      return;
    }

    // 2. Collect all FCM tokens of these admins
    let tokens = [];
    adminsSnapshot.forEach((doc) => {
      const userData = doc.data();
      // fcmTokens is an array we save from client side
      if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
        tokens = tokens.concat(userData.fcmTokens);
      } else if (userData.fcmToken) {
        // Fallback to single token if array doesn't exist
        tokens.push(userData.fcmToken);
      }
    });

    // Remove duplicates
    tokens = [...new Set(tokens)];

    if (tokens.length === 0) {
      console.log("No FCM tokens found for the admins.");
      return;
    }

    // 3. Construct the push notification payload
    const message = {
      notification: {
        title: "New Join Request",
        body: `${userName} has requested to join your clinic.`,
      },
      tokens: tokens,
    };

    // 4. Send the messages
    const response = await admin.messaging().sendEachForMulticast(message);
    
    console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} failed.`);
    
    // Optional: Clean up failed tokens (e.g. if they are unregistered)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
          console.error("Failed to send to token:", tokens[idx], resp.error);
        }
      });
      // Further logic could remove these failedTokens from the user docs if needed.
    }
  } catch (error) {
    console.error("Error sending join request notifications:", error);
  }
});
