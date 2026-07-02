
import { initializeApp, getApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

// Export the hooks and providers from their respective files
export * from './provider';
export * from './client-provider';
export * from './auth/use-user';


interface FirebaseInstances {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function initializeFirebase(): FirebaseInstances {
  if (getApps().length) {
    const firebaseApp = getApp();
    const auth = getAuth(firebaseApp);
    const firestore = getFirestore(firebaseApp);
    const storage = getStorage(firebaseApp);
    return { firebaseApp, auth, firestore, storage };
  }

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const storage = getStorage(firebaseApp);

  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestore)
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          // This can happen if you have multiple tabs open.
          console.warn('Firestore persistence failed. This is normal with multiple tabs open.');
        } else if (err.code === 'unimplemented') {
          console.warn('Firestore persistence is not supported in this browser.');
        }
      });
  }

  return { firebaseApp, auth, firestore, storage };
}

