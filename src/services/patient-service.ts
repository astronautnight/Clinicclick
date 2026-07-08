

'use client';

import {
  collection,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { Patient } from "@/types";
import { initializeFirebase } from "@/firebase";
import { recordActiveDay } from "./clinic-service";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  FirestorePermissionError,
  type SecurityRuleContext,
} from "@/firebase/errors";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import imageCompression from 'browser-image-compression';

const { firestore: db, storage } = initializeFirebase();

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * Upload a single patient photo to Firebase Storage with automatic compression.
 */
export async function uploadPatientFile(
  clinicId: string,
  patientId: string,
  file: File,
  uid: string,
  folderType: 'photos' | 'xrays' | 'scans' = 'photos'
): Promise<string> {
  if (!clinicId || !patientId) {
    throw new Error('clinicId and patientId are required');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File "${file.name}" exceeds the 20 MB limit.`);
  }

  let fileToUpload = file;
  try {
    const options = {
      maxSizeMB: 0.75, // 750 KB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };
    fileToUpload = await imageCompression(file as any, options);
  } catch (error: any) {
    console.warn(`Image compression failed: ${error.message}`);
  }

  const safeName = fileToUpload.name ? fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_') : `photo_${Date.now()}.jpg`;
  const storagePath = `clinics/${clinicId}/patients/${patientId}/${folderType}/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  try {
    await uploadBytes(storageRef, fileToUpload as Blob, {
      contentType: fileToUpload.type || file.type,
      customMetadata: { uploadedBy: uid },
    });
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Delete a patient photo from Firebase Storage.
 */
export async function deletePatientPhoto(photoUrl: string): Promise<boolean> {
  if (!photoUrl) return false;
  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
    return true;
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found') {
      return true;
    }
    console.error('Error deleting patient photo:', error);
    return false;
  }
}

/**
 * Data allowed to be updated (no id / timestamps)
 */
type UpdatablePatientData = Partial<
  Omit<Patient, "id" | "createdAt" | "updatedAt">
>;

/**
 * -----------------------------
 * ADD PATIENT (CLINIC SCOPED)
 * -----------------------------
 */
export async function addPatient(
  clinicId: string,
  patientData: Omit<
    Patient,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "photos"
    | "videos"
    | "linkedProcedures"
  > & { photos?: File[]; videos?: File[] }
): Promise<string | undefined> {
  if (!clinicId) {
    console.error("Clinic ID is required to add a patient.");
    return;
  }

  const patientsColRef = collection(db, "clinics", clinicId, "patients");
  const newPatientRef = doc(patientsColRef);

  const { photos, videos, ...dataToSave } = patientData;

  const payload = {
    ...dataToSave,
    linkedProcedures: [],
    markedTeeth: dataToSave.markedTeeth || [],
    stagedObservations: dataToSave.stagedObservations || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(newPatientRef, payload);
    await recordActiveDay(clinicId);
    return newPatientRef.id;
  } catch (error: any) {
    if (error.code === "permission-denied") {
      const permissionError = new FirestorePermissionError({
        path: newPatientRef.path,
        operation: "create",
        requestResourceData: payload,
      } satisfies SecurityRuleContext);

      errorEmitter.emit("permission-error", permissionError);
    } else {
      console.error("Error adding patient:", error);
    }
    return undefined;
  }
}

/**
 * -----------------------------
 * UPDATE PATIENT (CLINIC SCOPED)
 * -----------------------------
 */
export async function updatePatient(
  clinicId: string,
  patientId: string,
  patientData: UpdatablePatientData
): Promise<boolean> {
  if (!clinicId || !patientId) {
    console.error("Clinic ID and Patient ID are required.");
    return false;
  }

  const patientDocRef = doc(
    db,
    "clinics",
    clinicId,
    "patients",
    patientId
  );

  const payload = {
    ...patientData,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(patientDocRef, payload);
    await recordActiveDay(clinicId);
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied") {
      const permissionError = new FirestorePermissionError({
        path: patientDocRef.path,
        operation: "update",
        requestResourceData: payload,
      } satisfies SecurityRuleContext);

      errorEmitter.emit("permission-error", permissionError);
    } else {
      console.error("Error updating patient:", error);
    }
    return false;
  }
}

/**
 * -----------------------------
 * DELETE PATIENT (CLINIC SCOPED)
 * -----------------------------
 */
export async function deletePatient(
  clinicId: string,
  patientId: string
): Promise<boolean> {
  if (!clinicId || !patientId) {
    console.error("Clinic ID and Patient ID are required.");
    return false;
  }

  const patientDocRef = doc(
    db,
    "clinics",
    clinicId,
    "patients",
    patientId
  );

  try {
    await deleteDoc(patientDocRef);
    return true;
  } catch (error: any) {
    if (error.code === "permission-denied") {
      const permissionError = new FirestorePermissionError({
        path: patientDocRef.path,
        operation: "delete",
      } satisfies SecurityRuleContext);

      errorEmitter.emit("permission-error", permissionError);
    } else {
      console.error("Error deleting patient:", error);
    }
    return false;
  }
}
