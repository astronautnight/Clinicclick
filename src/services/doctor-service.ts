
'use client';

import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Doctor } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

/**
 * ADD DOCTOR
 * Path: clinics/{clinicId}/doctors
 */
export async function addDoctor(
  clinicId: string,
  doctorData: Omit<
    Doctor,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'assignedPatients'
    | 'assignedProcedures'
  >
): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add a doctor.');
  }

  const doctorsColRef = collection(db, "clinics", clinicId, "doctors");

  const payload = {
    ...doctorData,
    doctorType: doctorData.doctorType || 'doctor',
    assignedPatients: [],
    assignedProcedures: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await addDoc(doctorsColRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: doctorsColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

/**
 * UPDATE DOCTOR
 * Path: clinics/{clinicId}/doctors/{doctorId}
 */
export async function updateDoctor(
  clinicId: string,
  doctorId: string,
  doctorData: Partial<Omit<Doctor, 'id' | 'createdAt'>>
): Promise<void> {
  if (!clinicId || !doctorId) {
    throw new Error('Clinic ID and Doctor ID are required to update a doctor.');
  }

  const doctorDocRef = doc(db, "clinics", clinicId, "doctors", doctorId);

  const payload = {
    ...doctorData,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doctorDocRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: doctorDocRef.path,
        operation: 'update',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

/**
 * DELETE DOCTOR
 * Path: clinics/{clinicId}/doctors/{doctorId}
 */
export async function deleteDoctor(
  clinicId: string,
  doctorId: string
): Promise<void> {
  if (!clinicId || !doctorId) {
    throw new Error('Clinic ID and Doctor ID are required to delete a doctor.');
  }

  const doctorDocRef = doc(db, "clinics", clinicId, "doctors", doctorId);

  try {
    await deleteDoc(doctorDocRef);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: doctorDocRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

    