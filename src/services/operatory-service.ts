
'use client';

import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const { firestore: db } = initializeFirebase();

export async function addOperatory(clinicId: string, name: string): Promise<void> {
  if (!clinicId || !name) {
    throw new Error('Clinic ID and operatory name are required.');
  }
  const operatoriesColRef = collection(db, 'clinics', clinicId, 'operatories');
  const payload = {
    name,
    status: 'Available',
    currentPatientId: null,
    currentPatientName: null,
    createdAt: serverTimestamp(),
  };
  try {
    await addDoc(operatoriesColRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: operatoriesColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function deleteOperatory(clinicId: string, operatoryId: string): Promise<void> {
  if (!clinicId || !operatoryId) {
    throw new Error('Clinic ID and operatory ID are required.');
  }
  const operatoryDocRef = doc(db, 'clinics', clinicId, 'operatories', operatoryId);
  try {
    await deleteDoc(operatoryDocRef);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: operatoryDocRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function assignPatientToOperatory(
  clinicId: string,
  operatoryId: string,
  patientId: string,
  patientName: string
): Promise<void> {
  if (!clinicId || !operatoryId || !patientId || !patientName) {
    throw new Error('All parameters are required.');
  }
  const operatoryDocRef = doc(db, 'clinics', clinicId, 'operatories', operatoryId);
  const payload = {
    currentPatientId: patientId,
    currentPatientName: patientName,
    status: 'Occupied',
  };
  try {
    await updateDoc(operatoryDocRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: operatoryDocRef.path,
        operation: 'update',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function clearOperatory(clinicId: string, operatoryId: string): Promise<void> {
  if (!clinicId || !operatoryId) {
    throw new Error('Clinic ID and operatory ID are required.');
  }
  const operatoryDocRef = doc(db, 'clinics', clinicId, 'operatories', operatoryId);
  const payload = {
    currentPatientId: null,
    currentPatientName: null,
    status: 'Available',
  };
  try {
    await updateDoc(operatoryDocRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: operatoryDocRef.path,
        operation: 'update',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}
