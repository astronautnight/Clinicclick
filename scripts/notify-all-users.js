const admin = require('firebase-admin');
// You must download this from Firebase Console -> Project Settings -> Service Accounts
const serviceAccount = require('./serviceAccountKey.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function notifyAllUsers() {
  console.log('Fetching all users...');
  const usersSnap = await db.collection('users').get();
  const users = usersSnap.docs;

  console.log(`Found ${users.length} users. Sending notifications...`);
  
  const batch = db.batch();
  let count = 0;

  for (const user of users) {
    const notifRef = db.collection('users').doc(user.id).collection('notifications').doc();
    batch.set(notifRef, {
      type: 'system',
      title: 'Founder Program',
      body: 'Add your clinic to receive discounts on founder program',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      actionUrl: '/clinic',
    });
    
    count++;

    // Firestore batches can only have 500 operations
    if (count % 400 === 0) {
      await batch.commit();
      console.log(`Committed ${count} notifications...`);
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(`Successfully notified ${count} users!`);
}

notifyAllUsers().catch(console.error);
