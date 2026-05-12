
'use client';

import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, useUser } from "@/firebase";
import type { UserProfile } from "@/types";

// Note: These functions are designed to be used within a component that has access to the Firebase context.
// However, to make them callable from a server action or a non-hook environment inside a component,
// they need db and user instances passed to them.

export async function getProfile(db: any, user: any): Promise<UserProfile | null> {
  if (!db || !user) return null;

  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as UserProfile;
}

export async function updateProfile(db: any, user: any, data: Partial<UserProfile>): Promise<UserProfile> {
  if (!db || !user) throw new Error("Not authenticated");

  const docRef = doc(db, "users", user.uid);

  const payload = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  // setDoc with merge: true will create the doc if it doesn't exist or update it if it does.
  await setDoc(docRef, payload, { merge: true });

  // For consistency, we can refetch or just return the merged data.
  // Returning merged data is faster and usually sufficient.
  const currentData = (await getDoc(docRef)).data();

  return {
    id: user.uid,
    ...currentData,
    ...payload,
  } as UserProfile;
}

export async function deleteProfile(db: any, user: any): Promise<void> {
  if (!db || !user) return;

  const docRef = doc(db, "users", user.uid);
  await deleteDoc(docRef);
}

    