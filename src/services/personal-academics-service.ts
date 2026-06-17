
'use client';

/**
 * personal-academics-service.ts
 *
 * Handles academic data for users who have NOT joined a clinic.
 *
 * Firestore path structure (all odd-segment collections ✓):
 *   users/{uid}/personalAcademics/data/studentCaseHistories/{caseId}  ← 5-seg collection, 6-seg doc
 *   users/{uid}/personalAcademics/data/departments/{deptId}
 *   users/{uid}/personalAcademics/data/attendance/{dateId}
 *   users/{uid}/personalAcademics/data/finances/{financeId}
 *
 * Security rules: /users/{userId}/personalAcademics/data/{col}/{docId}
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { StudentCaseHistory, StudentFinancialEntry, AttendanceStatus } from '@/types';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const { firestore: db } = initializeFirebase();

/* ------------------------------------------------------------------ */
/* Path helpers                                                         */
/* ------------------------------------------------------------------ */

/**
 * Returns a CollectionReference with 5 path segments (valid, odd number).
 * users / {uid} / personalAcademics / data / {col}
 */
export function getPersonalAcademicsCol(
  uid: string,
  col: 'studentCaseHistories' | 'departments' | 'attendance' | 'finances'
) {
  return collection(db, 'users', uid, 'personalAcademics', 'data', col);
}

/**
 * Returns a DocumentReference with 6 path segments (valid, even number).
 * users / {uid} / personalAcademics / data / {col} / {docId}
 */
function getPersonalAcademicsDocRef(
  uid: string,
  col: 'studentCaseHistories' | 'departments' | 'attendance' | 'finances',
  docId: string
) {
  return doc(db, 'users', uid, 'personalAcademics', 'data', col, docId);
}

/* ------------------------------------------------------------------ */
/* DEPARTMENTS                                                          */
/* ------------------------------------------------------------------ */

export async function addPersonalDepartment(
  uid: string,
  name: string
): Promise<string | undefined> {
  if (!uid || !name.trim()) { console.error('UID and name required'); return; }

  const col = getPersonalAcademicsCol(uid, 'departments');
  try {
    const docRef = await addDoc(col, { name: name.trim() });
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: col.path, operation: 'create' }));
    } else {
      console.error('Error adding personal department:', error);
    }
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* CASE HISTORIES                                                       */
/* ------------------------------------------------------------------ */

type NewCaseHistoryData = Omit<StudentCaseHistory, 'id' | 'createdAt' | 'updatedAt'>;

export async function addPersonalCaseHistory(
  uid: string,
  data: NewCaseHistoryData
): Promise<string | undefined> {
  if (!uid) { console.error('UID required'); return; }

  const col = getPersonalAcademicsCol(uid, 'studentCaseHistories');
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  try {
    const docRef = await addDoc(col, payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: col.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error adding personal case history:', error);
    }
    return undefined;
  }
}

export async function updatePersonalCaseHistory(
  uid: string,
  caseId: string,
  data: Partial<Omit<StudentCaseHistory, 'id' | 'createdAt'>>
): Promise<boolean> {
  if (!uid || !caseId) { console.error('UID and caseId required'); return false; }

  const caseRef = getPersonalAcademicsDocRef(uid, 'studentCaseHistories', caseId);
  const payload = { ...data, updatedAt: serverTimestamp() };

  try {
    await updateDoc(caseRef, payload);
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: caseRef.path, operation: 'update', requestResourceData: payload }));
    } else {
      console.error('Error updating personal case history:', error);
    }
    return false;
  }
}

export async function deletePersonalCaseHistory(
  uid: string,
  caseId: string
): Promise<boolean> {
  if (!uid || !caseId) { console.error('UID and caseId required'); return false; }

  const caseRef = getPersonalAcademicsDocRef(uid, 'studentCaseHistories', caseId);

  try {
    await deleteDoc(caseRef);
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: caseRef.path, operation: 'delete' }));
    } else {
      console.error('Error deleting personal case history:', error);
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* ATTENDANCE                                                           */
/* ------------------------------------------------------------------ */

/**
 * Set personal attendance. Document ID = date string (yyyy-MM-dd).
 * Path: users/{uid}/personalAcademics/data/attendance/{date}  ← 6 segments ✓
 */
export async function setPersonalAttendance(
  uid: string,
  date: string,
  status: AttendanceStatus,
  opts?: { departmentId?: string; departmentName?: string }
): Promise<boolean> {
  if (!uid || !date) { console.error('UID and date required'); return false; }

  const attendanceRef = getPersonalAcademicsDocRef(uid, 'attendance', date);
  const payload = {
    status,
    date,
    departmentId: opts?.departmentId ?? '',
    departmentName: opts?.departmentName ?? '',
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(attendanceRef, payload, { merge: true });
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: attendanceRef.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error setting personal attendance:', error);
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* FINANCES                                                             */
/* ------------------------------------------------------------------ */

type NewFinanceData = Omit<StudentFinancialEntry, 'id' | 'createdAt'>;

export async function addPersonalFinance(
  uid: string,
  data: NewFinanceData
): Promise<string | undefined> {
  if (!uid) { console.error('UID required'); return; }

  const col = getPersonalAcademicsCol(uid, 'finances');
  const payload = { ...data, createdAt: serverTimestamp() };

  try {
    const docRef = await addDoc(col, payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: col.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error adding personal finance entry:', error);
    }
    return undefined;
  }
}
