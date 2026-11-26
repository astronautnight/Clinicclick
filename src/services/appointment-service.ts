
'use client';

import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Appointment } from "@/types";
import { initializeFirebase } from "@/firebase";
import { recordActiveDay } from "./clinic-service";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

export function cleanFirestoreData<T = any>(data: T): T {
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanFirestoreData(item)) as any;
  }
  if (data !== null && typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned;
  }
  return data;
}

type CreatableAppointmentData = Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>;
type UpdatableAppointmentData = Partial<Omit<Appointment, 'id' | 'createdAt'>>;

export async function addAppointment(clinicId: string, appointmentData: CreatableAppointmentData): Promise<string | void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add an appointment.');
  }
  
  const appointmentsColRef = collection(db, "clinics", clinicId, "appointments");
  
  const cleanedData = cleanFirestoreData(appointmentData);
  const payload = {
    ...cleanedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(appointmentsColRef, payload);
    await recordActiveDay(clinicId);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: appointmentsColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function updateAppointment(clinicId: string, appointmentId: string, appointmentData: UpdatableAppointmentData): Promise<void> {
    if (!clinicId || !appointmentId) {
        throw new Error('Clinic ID and Appointment ID are required to update an appointment.');
    }

    const appointmentDocRef = doc(db, "clinics", clinicId, "appointments", appointmentId);

    const cleanedData = cleanFirestoreData(appointmentData);
    const payload = {
        ...cleanedData,
        updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(appointmentDocRef, payload);
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: appointmentDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function deleteAppointment(clinicId: string, appointmentId: string): Promise<void> {
  if (!clinicId || !appointmentId) {
    throw new Error('Clinic ID and Appointment ID are required to delete an appointment.');
  }

  const appointmentDocRef = doc(db, "clinics", clinicId, "appointments", appointmentId);

  try {
    await deleteDoc(appointmentDocRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: appointmentDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      throw error;
  }
}

