
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
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';

import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { getUserProfile } from './auth-service';
import { addDoctor } from './doctor-service';
import { addStaffMember } from './staff-service';

const { firestore: db } = initializeFirebase();

/* ============================================================
   TYPES
============================================================ */

interface CreateClinicInput {
  ownerUid: string;
  clinicName: string;
  address: string;
  phone: string;
  clinicType: 'General' | 'Specialist' | 'Multi-specialty';
}

interface JoinClinicInput {
  userId: string;
  inviteCode: string;
  requestedRole: string;
}

type ClinicRole = 'admin' | 'member';

/* ============================================================
   HELPERS
============================================================ */

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Helper: delete all documents in a subcollection
 */
async function deleteSubcollection(clinicId: string, subcollectionName: string) {
  const colRef = collection(db, 'clinics', clinicId, subcollectionName);
  const snap = await getDocs(colRef);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (snap.docs.length > 0) {
    await batch.commit();
  }
}

/* ============================================================
   CREATE CLINIC
============================================================ */

export async function createClinic({
  ownerUid,
  clinicName,
  address,
  phone,
  clinicType,
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
      address,
      phone,
      clinicType,
      inviteCode: generateInviteCode(),
      createdBy: ownerUid,
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
  requestedRole,
}: JoinClinicInput): Promise<{ clinicId: string }> {
  if (!userId || !inviteCode || !requestedRole) {
    throw new Error('User ID, invite code, and requested role are required');
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
      displayName: userProfile?.displayName || 'Unknown User',
      requestedRole: requestedRole,
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
    // Check member count — if only 1 member exists, the new member becomes admin
    const membersSnap = await getDocs(collection(db, 'clinics', clinicId, 'members'));
    const effectiveRole = membersSnap.size <= 1 ? 'admin' : role;

    const userProfile = await getUserProfile(userId);
    const displayName = userProfile?.displayName || 'User';

    // Retrieve requestedRole from pendingRequest
    const pendingReqSnap = await getDoc(doc(db, 'clinics', clinicId, 'pendingRequests', userId));
    const requestedRole = pendingReqSnap.exists() ? pendingReqSnap.data().requestedRole : null;

    // 1️⃣ Add to members
    await setDoc(
      doc(db, 'clinics', clinicId, 'members', userId),
      {
        role: effectiveRole,
        joinedAt: serverTimestamp(),
        displayName: displayName,
        jobRole: requestedRole || 'Other',
      }
    );

    // 2️⃣ Update user profile (🔥 THIS IS THE KEY 🔥)
    await updateDoc(doc(db, 'users', userId), {
      clinicId,
      role: effectiveRole,
      updatedAt: serverTimestamp(),
    });

    // 3️⃣ Remove pending request
    await deleteDoc(
      doc(db, 'clinics', clinicId, 'pendingRequests', userId)
    );

    // 4️⃣ Auto-create Doctor or Staff record
    if (requestedRole === 'Doctor') {
      await addDoctor(clinicId, {
        name: displayName,
        email: userProfile?.email || undefined,
        specialization: 'General Dentistry',
        doctorType: 'activedoctor',
        color: '#3b82f6', // Default blue color
      });
    } else if (requestedRole !== 'Doctor' && requestedRole) {
      await addStaffMember(clinicId, {
        name: displayName,
        email: userProfile?.email || undefined,
        role: requestedRole,
      });
    }
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
   UPDATE MEMBER JOB ROLE (ADMIN) - Syncs with Doctors/Staff
============================================================ */

export async function updateMemberJobRole({
  clinicId,
  userId,
  memberEmail,
  memberName,
  newJobRole,
}: {
  clinicId: string;
  userId: string;
  memberEmail?: string;
  memberName: string;
  newJobRole: 'Doctor' | 'Receptionist' | 'Dental Assistant' | 'Hygienist' | 'Office Manager' | 'Other';
}) {
  // 1️⃣ Update the jobRole in members subcollection
  await updateDoc(
    doc(db, 'clinics', clinicId, 'members', userId),
    { jobRole: newJobRole }
  );

  // 2️⃣ Find existing records in doctors and staff using email or name
  const doctorsCol = collection(db, 'clinics', clinicId, 'doctors');
  const staffCol = collection(db, 'clinics', clinicId, 'staff');

  const doctorsSnap = await getDocs(doctorsCol);
  const staffSnap = await getDocs(staffCol);

  let existingDoctorId: string | null = null;
  let existingStaffId: string | null = null;

  doctorsSnap.forEach(docSnap => {
    const data = docSnap.data();
    if ((memberEmail && data.email === memberEmail) || data.name === memberName) {
      existingDoctorId = docSnap.id;
    }
  });

  staffSnap.forEach(docSnap => {
    const data = docSnap.data();
    if ((memberEmail && data.email === memberEmail) || data.name === memberName) {
      existingStaffId = docSnap.id;
    }
  });

  // 3️⃣ Delete from old collection and add to new collection based on newJobRole
  if (newJobRole === 'Doctor') {
    if (existingStaffId) {
      await deleteDoc(doc(db, 'clinics', clinicId, 'staff', existingStaffId));
    }
    if (!existingDoctorId) {
      await addDoctor(clinicId, {
        name: memberName,
        email: memberEmail || undefined,
        specialization: 'General Dentistry',
        doctorType: 'activedoctor',
        color: '#3b82f6',
      });
    }
  } else {
    if (existingDoctorId) {
      await deleteDoc(doc(db, 'clinics', clinicId, 'doctors', existingDoctorId));
    }
    
    const staffRole = newJobRole;
    if (!existingStaffId) {
      await addStaffMember(clinicId, {
        name: memberName,
        email: memberEmail || undefined,
        role: staffRole,
      });
    } else {
      // If staff already exists, just update their role
      await updateDoc(doc(db, 'clinics', clinicId, 'staff', existingStaffId), {
        role: staffRole,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/* ============================================================
   REMOVE MEMBER (ADMIN / SELF)
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

  // Auto-promote: if only one member remains, make them admin
  const remainingSnap = await getDocs(collection(db, 'clinics', clinicId, 'members'));
  if (remainingSnap.size === 1) {
    const lastMember = remainingSnap.docs[0];
    if (lastMember.data().role !== 'admin') {
      await updateDoc(
        doc(db, 'clinics', clinicId, 'members', lastMember.id),
        { role: 'admin' }
      );
      await updateDoc(
        doc(db, 'users', lastMember.id),
        { role: 'admin', updatedAt: serverTimestamp() }
      );
    }
  }
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
  clinicData: {
    name?: string;
    address?: string;
    phone?: string;
    clinicType?: 'General' | 'Specialist' | 'Multi-specialty';
    logoUrl?: string;
  }
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

/* ============================================================
   DELETE CLINIC (LAST MEMBER ONLY)
============================================================ */

export async function deleteClinic({
  clinicId,
  userId,
}: {
  clinicId: string;
  userId: string;
}) {
  if (!clinicId || !userId) {
    throw new Error('clinicId and userId are required');
  }

  // Safety: ensure only the last member can delete
  const membersSnap = await getDocs(collection(db, 'clinics', clinicId, 'members'));
  if (membersSnap.size > 1) {
    throw new Error('Cannot delete clinic with more than one member. Other members must leave first.');
  }

  try {
    // 1️⃣ Clear user's clinic reference FIRST — this "removes" the last member from the clinic
    // and triggers the onSnapshot in use-user.tsx so the UI updates immediately
    await updateDoc(doc(db, 'users', userId), {
      clinicId: null,
      role: null,
      updatedAt: serverTimestamp(),
    });

    // 2️⃣ Delete the clinic document (member doc still exists for permission checks on subcollections)
    await deleteDoc(doc(db, 'clinics', clinicId));

    // 3️⃣ Delete all subcollections (member doc still exists for permission checks)
    const subcollections = [
      'pendingRequests',
      'operatories',
      'patients',
      'appointments',
      'transactions',
      'procedures',
      'invoices',
    ];

    for (const sub of subcollections) {
      await deleteSubcollection(clinicId, sub);
    }

    // 4️⃣ Delete the member doc LAST — after all permission-gated operations are done
    await deleteDoc(doc(db, 'clinics', clinicId, 'members', userId));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path: `clinics/${clinicId}`,
          operation: 'delete',
        })
      );
    }
    throw error;
  }
}

/* ============================================================
   RECORD ACTIVE DAY
============================================================ */

export async function recordActiveDay(clinicId: string): Promise<void> {
  if (!clinicId) return;
  const dateStr = new Date().toISOString().split('T')[0];
  const clinicDocRef = doc(db, 'clinics', clinicId);

  try {
    await updateDoc(clinicDocRef, {
      activeDates: arrayUnion(dateStr),
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error("Failed to record active day:", error);
    // Non-blocking, so we don't throw an error to the user if it fails for some reason
  }
}