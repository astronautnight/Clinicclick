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

export interface EnsureUserProfileOptions {
  displayName?: string | null;
  photoURL?: string | null;
}

/* ------------------------------------------------------------------ */
/* Internal helper: ensure user profile exists with all standard fields */
/* ------------------------------------------------------------------ */
export async function ensureUserProfile(
  user: User,
  options?: EnsureUserProfileOptions
): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  const fallbackDisplayName = options?.displayName?.trim() || user.displayName || null;
  const fallbackPhotoURL = options?.photoURL || user.photoURL || null;
  const userEmail = user.email || null;

  if (!snap.exists()) {
    // 1️⃣ Brand-new user: initialize complete document with all core fields
    const payload = {
      uid: user.uid,
      email: userEmail,
      displayName: fallbackDisplayName,
      photoURL: fallbackPhotoURL,
      clinicId: null,
      role: null,
      notificationsEnabled: true,
      lastActiveAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);

    // Create a welcome survey notification for the new user
    try {
      const notifRef = doc(collection(db, 'users', user.uid, 'notifications'));
      await setDoc(notifRef, {
        type: 'survey_source',
        title: 'Welcome! How did you hear about us?',
        body: 'Tap here to let us know where you heard about Clinic@Click.',
        createdAt: serverTimestamp(),
        read: false,
      });
    } catch (e) {
      console.warn('Could not create initial welcome notification:', e);
    }

    return { id: user.uid, ...payload } as unknown as UserProfile;
  }

  // 2️⃣ Existing user: self-healing for missing fields without overwriting existing data
  const existing = snap.data();
  const updates: Record<string, unknown> = {};

  if (!existing.uid) {
    updates.uid = user.uid;
  }
  if ((!existing.email || existing.email === null) && userEmail) {
    updates.email = userEmail;
  }
  if ((!existing.displayName || existing.displayName === null) && fallbackDisplayName) {
    updates.displayName = fallbackDisplayName;
  }
  if ((!existing.photoURL || existing.photoURL === null) && fallbackPhotoURL) {
    updates.photoURL = fallbackPhotoURL;
  }
  if (typeof existing.notificationsEnabled !== 'boolean') {
    updates.notificationsEnabled = true;
  }
  if (existing.clinicId === undefined) {
    updates.clinicId = null;
  }
  if (existing.role === undefined) {
    updates.role = null;
  }
  if (!existing.createdAt) {
    // Back-fill createdAt for profiles created before this field was written
    updates.createdAt = serverTimestamp();
  }
  if (!existing.lastActiveAt) {
    updates.lastActiveAt = serverTimestamp();
  }

  // Update only if missing fields were detected
  if (Object.keys(updates).length > 0) {
    updates.updatedAt = serverTimestamp();
    await updateDoc(ref, updates);
  }

  return { id: user.uid, ...existing, ...updates } as unknown as UserProfile;
}

export async function getPostLoginRedirect(
  userId: string,
  returnUrl?: string | null
): Promise<string> {
  if (
    returnUrl &&
    returnUrl.startsWith('/') &&
    !returnUrl.startsWith('/login') &&
    !returnUrl.startsWith('/signup') &&
    returnUrl !== '/dashboard'
  ) {
    return returnUrl;
  }

  const profile = await getUserProfile(userId);
  if (profile && profile.clinicId) {
    return '/dashboard';
  }

  return '/clinic?mode=create';
}

/* ------------------------------------------------------------------ */
/* Auth methods */
/* ------------------------------------------------------------------ */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<User> {
  const result: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(result.user, { displayName });
  await sendEmailVerification(result.user);
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const result: UserCredential = await signInWithEmailAndPassword(auth, email, password);
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
export async function signInWithGoogleNative(): Promise<User> {
  return new Promise((resolve, reject) => {
    if (!(window as any).AndroidBridge) {
      reject(new Error('AndroidBridge not found'));
      return;
    }

    const successHandler = async (evt: Event) => {
      window.removeEventListener('nativeGoogleSignIn', successHandler);
      window.removeEventListener('nativeGoogleSignInError', errorHandler);

      const event = evt as CustomEvent;
      console.log('nativeGoogleSignIn event received:', event.detail);

      const idToken = event.detail?.idToken;
      if (!idToken) {
        reject(new Error('No idToken received from Android'));
        return;
      }

      try {
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await ensureUserProfile(result.user);
        resolve(result.user);
      } catch (err) {
        console.error('Firebase signInWithCredential failed:', err);
        reject(err);
      }
    };

    const errorHandler = (evt: Event) => {
      window.removeEventListener('nativeGoogleSignIn', successHandler);
      window.removeEventListener('nativeGoogleSignInError', errorHandler);
      const event = evt as CustomEvent;
      console.error('nativeGoogleSignInError event received:', event.detail);
      reject(new Error(event.detail?.error || 'Native Google Sign-In failed'));
    };

    window.addEventListener('nativeGoogleSignIn', successHandler);
    window.addEventListener('nativeGoogleSignInError', errorHandler);

    try {
      (window as any).AndroidBridge.startGoogleSignIn();
    } catch (err) {
      reject(new Error('Failed to call AndroidBridge.startGoogleSignIn'));
    }
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
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
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
  const inviteCode = nanoid(8).toUpperCase();
  await setDoc(clinicRef, {
    name: clinicName,
    inviteCode,
    createdBy: user.uid,
    creatorEmail: user.email || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, 'clinics', clinicRef.id, 'members', user.uid), {
    role: 'admin',
    joinedAt: serverTimestamp(),
    displayName: user.displayName || 'Owner',
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
  const q = query(collection(db, 'clinics'), where('inviteCode', '==', inviteCode));
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