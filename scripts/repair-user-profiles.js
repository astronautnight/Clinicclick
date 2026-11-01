/**
 * Standalone Migration Script: Repair Incomplete Firestore User Profiles
 * 
 * Usage:
 *   node scripts/repair-user-profiles.js
 * 
 * Requirements:
 *   - Service account key in scripts/serviceAccountKey.json OR GOOGLE_APPLICATION_CREDENTIALS env var.
 * 
 * Safety:
 *   - Never overwrites existing clinicId, role, or user details.
 *   - Only backfills missing/empty fields: email, displayName, photoURL from Firebase Auth.
 *   - Sets clinicId: null, role: null for users without clinics.
 *   - Sets notificationsEnabled: true if undefined.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(keyPath)) {
  const serviceAccount = require(keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Fall back to default application credentials
  admin.initializeApp();
}

const db = admin.firestore();

async function repairUserProfiles() {
  console.log('--- Starting User Profile Audit & Safe Migration ---');
  const usersSnap = await db.collection('users').get();
  console.log(`Found ${usersSnap.size} total user documents in Firestore.`);

  let repairedCount = 0;
  let alreadyHealthyCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const uid = doc.id;
    const updates = {};
    const missing = [];

    let authUser = null;
    try {
      authUser = await admin.auth().getUser(uid);
    } catch (e) {
      // User may only exist in Firestore (e.g. mock or deleted auth)
    }

    if (!data.uid) {
      updates.uid = uid;
      missing.push('uid');
    }

    if ((!data.email || data.email === null) && authUser?.email) {
      updates.email = authUser.email;
      missing.push(`email -> ${authUser.email}`);
    }

    if ((!data.displayName || data.displayName === null) && authUser?.displayName) {
      updates.displayName = authUser.displayName;
      missing.push(`displayName -> ${authUser.displayName}`);
    }

    if ((!data.photoURL || data.photoURL === null) && authUser?.photoURL) {
      updates.photoURL = authUser.photoURL;
      missing.push('photoURL');
    }

    if (data.clinicId === undefined) {
      updates.clinicId = null;
      missing.push('clinicId (set null)');
    }

    if (data.role === undefined) {
      updates.role = null;
      missing.push('role (set null)');
    }

    if (typeof data.notificationsEnabled !== 'boolean') {
      updates.notificationsEnabled = true;
      missing.push('notificationsEnabled (set true)');
    }

    if (!data.createdAt) {
      updates.createdAt = authUser?.metadata?.creationTime
        ? admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.creationTime))
        : admin.firestore.FieldValue.serverTimestamp();
      missing.push('createdAt');
    }

    if (!data.lastActiveAt && authUser?.metadata?.lastSignInTime) {
      updates.lastActiveAt = admin.firestore.Timestamp.fromDate(new Date(authUser.metadata.lastSignInTime));
      missing.push('lastActiveAt');
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      await db.collection('users').doc(uid).set(updates, { merge: true });
      repairedCount++;
      console.log(`[REPAIRED] UID: ${uid} | Fixed: ${missing.join(', ')}`);
    } else {
      alreadyHealthyCount++;
    }
  }

  console.log('\n--- Migration Summary ---');
  console.log(`Total users scanned: ${usersSnap.size}`);
  console.log(`Already healthy: ${alreadyHealthyCount}`);
  console.log(`Repaired profiles: ${repairedCount}`);
  console.log('--- Done ---');
}

repairUserProfiles().catch(console.error);

