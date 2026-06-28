

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
import { errorEmitter } from "@/firebase/error-emitter";
import {
  FirestorePermissionError,
  type SecurityRuleContext,
} from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

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

  const { photos, videos, ...dataToSave } = patientData as any;

  const payload = {
    ...dataToSave,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(patientDocRef, payload);
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
