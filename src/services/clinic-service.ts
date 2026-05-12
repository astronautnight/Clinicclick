
'use client';

import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getUserProfile } from './auth-service';

const { firestore: db } = initializeFirebase();

/* ============================================================
   TYPES
============================================================ */

interface CreateClinicInput {
  ownerUid: string;
  clinicName: string;
}

interface JoinClinicInput {
  userId: string;
  inviteCode: string;
}

type ClinicRole = 'admin' | 'member';

/* ============================================================
   HELPERS
============================================================ */

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/* ============================================================
   CREATE CLINIC
============================================================ */

export async function createClinic({
  ownerUid,
  clinicName,
}: CreateClinicInput): Promise<{ clinicId: string }> {
  if (!ownerUid || !clinicName) {
    throw new Error('Owner UID and clinic name are required');
  }

  // ❗ SAFETY: user cannot already be in a clinic
  const userSnap = await getDoc(doc(db, 'users', ownerUid));
  if (userSnap.exists() && userSnap.data().clinicId) {
    throw new Error('You are already part of a clinic');
  }

  try {
    // 1️⃣ Create clinic document
    const clinicRef = await addDoc(collection(db, 'clinics'), {
      name: clinicName,
      inviteCode: generateInviteCode(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const clinicId = clinicRef.id;

    // 2️⃣ Create members/{ownerUid}
    await setDoc(
      doc(db, 'clinics', clinicId, 'members', ownerUid),
      {
        role: 'admin',
        joinedAt: serverTimestamp(),
        displayName: userSnap.data()?.displayName || 'Owner'
      }
    );

    // 3️⃣ Update user profile (THIS unlocks access)
    await updateDoc(doc(db, 'users', ownerUid), {
      clinicId,
      role: 'admin',
      updatedAt: serverTimestamp(),
    });

    return { clinicId };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: 'clinics',
          operation: 'create',
        })
      );
    }
    throw error;
  }
}

/* ============================================================
   JOIN CLINIC (REQUEST ONLY)
============================================================ */

export async function joinClinicWithCode({
  userId,
  inviteCode,
}: JoinClinicInput): Promise<{ clinicId: string }> {
  if (!userId || !inviteCode) {
    throw new Error('User ID and invite code required');
  }

  // ❗ SAFETY: user cannot already be in a clinic
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (userSnap.exists() && userSnap.data().clinicId) {
    throw new Error('You are already part of a clinic');
  }

  // 1️⃣ Find clinic by invite code
  const q = query(
    collection(db, 'clinics'),
    where('inviteCode', '==', inviteCode)
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Invalid invite code');
  }

  const clinicId = snap.docs[0].id;
  const userProfile = await getUserProfile(userId);

  // 2️⃣ Create pending request (NO ACCESS YET)
  await setDoc(
    doc(db, 'clinics', clinicId, 'pendingRequests', userId),
    {
      requestedAt: serverTimestamp(),
      displayName: userProfile?.displayName || 'Unknown User'
    }
  );

  // ❌ DO NOT update users/{uid} here
  return { clinicId };
}

/* ============================================================
   APPROVE JOIN REQUEST (ADMIN)
============================================================ */

export async function approveClinicRequest({
  clinicId,
  userId,
  role = 'member',
}: {
  clinicId: string;
  userId: string;
  role?: ClinicRole;
}) {
  if (!clinicId || !userId) {
    throw new Error('clinicId and userId required');
  }

  try {
    const userProfile = await getUserProfile(userId);
    // 1️⃣ Add to members
    await setDoc(
      doc(db, 'clinics', clinicId, 'members', userId),
      {
        role,
        joinedAt: serverTimestamp(),
        displayName: userProfile?.displayName || 'User'
      }
    );

    // 2️⃣ Update user profile (🔥 THIS IS THE KEY 🔥)
    await updateDoc(doc(db, 'users', userId), {
      clinicId,
      role,
      updatedAt: serverTimestamp(),
    });

    // 3️⃣ Remove pending request
    await deleteDoc(
      doc(db, 'clinics', clinicId, 'pendingRequests', userId)
    );
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `clinics/${clinicId}`,
          operation: 'update',
        })
      );
    }
    throw error;
  }
}

/* ============================================================
   REJECT JOIN REQUEST (ADMIN)
============================================================ */

export async function rejectClinicRequest({
  clinicId,
  userId,
}: {
  clinicId: string;
  userId: string;
}) {
  await deleteDoc(
    doc(db, 'clinics', clinicId, 'pendingRequests', userId)
  );
}

/* ============================================================
   UPDATE MEMBER ROLE (ADMIN)
============================================================ */

export async function updateMemberRole({
  clinicId,
  userId,
  role,
}: {
  clinicId: string;
  userId: string;
  role: ClinicRole;
}) {
  await updateDoc(
    doc(db, 'clinics', clinicId, 'members', userId),
    { role }
  );

  await updateDoc(
    doc(db, 'users', userId),
    {
      role,
      updatedAt: serverTimestamp(),
    }
  );
}

/* ============================================================
   REMOVE MEMBER (ADMIN)
============================================================ */

export async function removeClinicMember({
  clinicId,
  userId,
}: {
  clinicId: string;
  userId: string;
}) {
  await deleteDoc(
    doc(db, 'clinics', clinicId, 'members', userId)
  );

  await updateDoc(
    doc(db, 'users', userId),
    {
      clinicId: null,
      role: null,
      updatedAt: serverTimestamp(),
    }
  );
}

/* ============================================================
   GET CLINIC
============================================================ */

export async function getClinic(clinicId: string) {
  if (!clinicId) return null;

  const snap = await getDoc(doc(db, 'clinics', clinicId));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}

/* ============================================================
   REGENERATE INVITE CODE (ADMIN)
============================================================ */

export async function regenerateInviteCode(
  clinicId: string
): Promise<string> {
  if (!clinicId) {
    throw new Error('Clinic ID is required');
  }

  const newCode = generateInviteCode();

  try {
    await updateDoc(doc(db, 'clinics', clinicId), {
      inviteCode: newCode,
      updatedAt: serverTimestamp(),
    });
    return newCode;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `clinics/${clinicId}`,
          operation: 'update',
        })
      );
    }
    throw error;
  }
}


/**
 * UPDATE CLINIC
 * Path: clinics/{clinicId}
 */
export async function updateClinic(
  clinicId: string,
  clinicData: { name?: string }
): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to update clinic details.');
  }

  const clinicDocRef = doc(db, 'clinics', clinicId);

  const payload = {
    ...clinicData,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(clinicDocRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: clinicDocRef.path,
        operation: 'update',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

    