
'use client';

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import type { UserProfile } from "@/types";

// Note: These functions are designed to be used within a component that has access to the Firebase context.
// However, to make them callable from a server action or a non-hook environment inside a component,
// they need db and user instances passed to them.

export async function getProfile(db: any, user: any): Promise<UserProfile | null> {
  if (!db || !user?.uid) return null;

  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    uid: user.uid,
    displayName: data?.displayName ?? user.displayName ?? null,
    email: data?.email ?? user.email ?? null,
    ...data,
  } as UserProfile;
}

export async function updateProfile(db: any, user: any, data: Partial<UserProfile>): Promise<UserProfile> {
  if (!db || !user?.uid) throw new Error("Not authenticated");

  const docRef = doc(db, "users", user.uid);

  const payload: Partial<UserProfile> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // setDoc with merge: true will create the doc if it doesn't exist or update it if it does.
  await setDoc(docRef, payload, { merge: true });

  // For consistency, refetch the updated document.
  const currentSnap = await getDoc(docRef);
  const currentData = currentSnap.data();

  return {
    id: user.uid,
    uid: user.uid,
    displayName: currentData?.displayName ?? user.displayName ?? null,
    email: currentData?.email ?? user.email ?? null,
    ...currentData,
  } as UserProfile;
}

export async function deleteProfile(db: any, user: any): Promise<void> {
  if (!db || !user) return;

  const docRef = doc(db, "users", user.uid);
  await deleteDoc(docRef);
}

    