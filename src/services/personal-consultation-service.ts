
'use client';

/**
 * personal-consultation-service.ts
 *
 * Handles consultation data for users who have NOT joined a clinic.
 *
 * Firestore path structure (all odd-segment collections ✓):
 *   users/{uid}/personalConsultation/data/patients/{patientId}       ← 5-seg collection, 6-seg doc
 *   users/{uid}/personalConsultation/data/appointments/{id}
 *   users/{uid}/personalConsultation/data/transactions/{id}
 *
 * Security rules: /users/{userId}/personalConsultation/data/{col}/{docId}
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Patient, Appointment, Transaction } from '@/types';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const { firestore: db } = initializeFirebase();

/* ------------------------------------------------------------------ */
/* Path helper                                                          */
/* ------------------------------------------------------------------ */

/**
 * Returns a CollectionReference with 5 path segments (valid, odd number).
 * users / {uid} / personalConsultation / data / {col}
 */
export function getPersonalConsultCol(
  uid: string,
  col: 'patients' | 'appointments' | 'transactions'
) {
  return collection(db, 'users', uid, 'personalConsultation', 'data', col);
}

/**
 * Returns a DocumentReference with 6 path segments (valid, even number).
 * users / {uid} / personalConsultation / data / {col} / {docId}
 */
function getPersonalConsultDocRef(
  uid: string,
  col: 'patients' | 'appointments' | 'transactions',
  docId: string
) {
  return doc(db, 'users', uid, 'personalConsultation', 'data', col, docId);
}

/* ------------------------------------------------------------------ */
/* PATIENTS                                                             */
/* ------------------------------------------------------------------ */

type NewPatientData = Omit<Patient,
  | 'id' | 'createdAt' | 'updatedAt'
  | 'photos' | 'videos' | 'linkedProcedures' | 'markedTeeth'
> & { photos?: File[]; videos?: File[] };

export async function addPersonalConsultPatient(
  uid: string,
  patientData: NewPatientData
): Promise<string | undefined> {
  if (!uid) { console.error('UID required'); return; }

  const col = getPersonalConsultCol(uid, 'patients');
  const newRef = doc(col);
  const { photos, videos, ...dataToSave } = patientData;

  const payload = {
    ...dataToSave,
    linkedProcedures: [],
    markedTeeth: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(newRef, payload);
    return newRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: newRef.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error adding personal patient:', error);
    }
    return undefined;
  }
}

export async function updatePersonalConsultPatient(
  uid: string,
  patientId: string,
  patientData: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<boolean> {
  if (!uid || !patientId) { console.error('UID and patientId required'); return false; }

  const patientRef = getPersonalConsultDocRef(uid, 'patients', patientId);
  const { photos, videos, ...dataToSave } = patientData as any;
  const payload = { ...dataToSave, updatedAt: serverTimestamp() };

  try {
    await updateDoc(patientRef, payload);
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: patientRef.path, operation: 'update', requestResourceData: payload }));
    } else {
      console.error('Error updating personal patient:', error);
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* APPOINTMENTS                                                         */
/* ------------------------------------------------------------------ */

type NewAppointmentData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;

export async function addPersonalConsultAppointment(
  uid: string,
  appointmentData: NewAppointmentData
): Promise<string | undefined> {
  if (!uid) { console.error('UID required'); return; }

  const col = getPersonalConsultCol(uid, 'appointments');
  const payload = { ...appointmentData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  try {
    const docRef = await addDoc(col, payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: col.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error adding personal appointment:', error);
    }
    return undefined;
  }
}

export async function updatePersonalConsultAppointment(
  uid: string,
  appointmentId: string,
  appointmentData: Partial<Omit<Appointment, 'id' | 'createdAt'>>
): Promise<boolean> {
  if (!uid || !appointmentId) { console.error('UID and appointmentId required'); return false; }

  const apptRef = getPersonalConsultDocRef(uid, 'appointments', appointmentId);
  const payload = { ...appointmentData, updatedAt: serverTimestamp() };

  try {
    await updateDoc(apptRef, payload);
    return true;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: apptRef.path, operation: 'update', requestResourceData: payload }));
    } else {
      console.error('Error updating personal appointment:', error);
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* TRANSACTIONS                                                         */
/* ------------------------------------------------------------------ */

type NewTransactionData = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export async function addPersonalConsultTransaction(
  uid: string,
  transactionData: NewTransactionData
): Promise<string | undefined> {
  if (!uid) { console.error('UID required'); return; }

  const col = getPersonalConsultCol(uid, 'transactions');
  const payload = { ...transactionData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  try {
    const docRef = await addDoc(col, payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({ path: col.path, operation: 'create', requestResourceData: payload }));
    } else {
      console.error('Error adding personal transaction:', error);
    }
    return undefined;
  }
}
