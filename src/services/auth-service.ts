'use client';
import { nanoid } from 'nanoid';

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  sendEmailVerification,
  type UserCredential,
  type User,
} from 'firebase/auth';
import { getApps, initializeApp, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { UserProfile } from '@/types';

/* ------------------------------------------------------------------ */
/* Firebase init */
/* ------------------------------------------------------------------ */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

/* ------------------------------------------------------------------ */
/* Internal helper: ensure user profile exists */
/* ------------------------------------------------------------------ */
async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const payload: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> & {
      createdAt: any;
      updatedAt: any;
    } = {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      clinicId: null,
      role: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
  }
}

/* ------------------------------------------------------------------ */
/* Auth methods */
/* ------------------------------------------------------------------ */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result: UserCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  await ensureUserProfile(result.user);
  await sendEmailVerification(result.user);
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result: UserCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  await ensureUserProfile(result.user);
  return result.user;
}

// Web: popup flow
export async function signInWithGoogle(): Promise<User> {
  const result: UserCredential = await signInWithPopup(auth, provider);
  await ensureUserProfile(result.user);
  return result.user;
}

// PWA/Android: native Google Sign-In via AndroidBridge
// MainActivity.java opens the native account picker, gets idToken,
// fires a CustomEvent back to JS, and we sign in with the credential here
export async function signInWithGoogleNative(): Promise<User> {
  return new Promise((resolve, reject) => {
    // Trigger native Google Sign-In from Android
    (window as any).AndroidBridge.startGoogleSignIn();

    const successHandler = async (event: CustomEvent) => {
      window.removeEventListener(
        'nativeGoogleSignIn',
        successHandler as EventListener
      );
      window.removeEventListener(
        'nativeGoogleSignInError',
        errorHandler as EventListener
      );
      try {
        const credential = GoogleAuthProvider.credential(event.detail.idToken);
        const result = await signInWithCredential(auth, credential);
        await ensureUserProfile(result.user);
        resolve(result.user);
      } catch (err) {
        reject(err);
      }
    };

    const errorHandler = (event: CustomEvent) => {
      window.removeEventListener(
        'nativeGoogleSignIn',
        successHandler as EventListener
      );
      window.removeEventListener(
        'nativeGoogleSignInError',
        errorHandler as EventListener
      );
      reject(new Error(event.detail.error));
    };

    window.addEventListener(
      'nativeGoogleSignIn',
      successHandler as EventListener
    );
    window.addEventListener(
      'nativeGoogleSignInError',
      errorHandler as EventListener
    );
  });
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function verifyResetCode(code: string): Promise<string> {
  return await verifyPasswordResetCode(auth, code);
}

export async function confirmNewPassword(
  code: string,
  newPassword: string
): Promise<void> {
  await confirmPasswordReset(auth, code, newPassword);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/* ------------------------------------------------------------------ */
/* Profile helpers */
/* ------------------------------------------------------------------ */
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  if (!userId) throw new Error('User ID required');
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/* ------------------------------------------------------------------ */
/* Clinic onboarding helpers */
/* ------------------------------------------------------------------ */
export async function signUpCreateClinic(
  email: string,
  password: string,
  clinicName: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  await ensureUserProfile(user);

  const clinicRef = doc(collection(db, 'clinics'));
  const inviteCode = nanoid(8);

  await setDoc(clinicRef, {
    name: clinicName,
    inviteCode,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', user.uid), {
    clinicId: clinicRef.id,
    role: 'admin',
    updatedAt: serverTimestamp(),
  });

  return user;
}

export async function signUpJoinClinic(
  email: string,
  password: string,
  inviteCode: string
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;

  await ensureUserProfile(user);

  const q = query(
    collection(db, 'clinics'),
    where('inviteCode', '==', inviteCode)
  );
  const snap = await getDocs(q);

  if (snap.empty) throw new Error('Invalid invite code');

  const clinicDoc = snap.docs[0];

  await updateDoc(doc(db, 'users', user.uid), {
    clinicId: clinicDoc.id,
    role: 'member',
    updatedAt: serverTimestamp(),
  });

  return user;
}