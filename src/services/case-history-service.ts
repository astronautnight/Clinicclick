
'use client';

import {
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { StudentCaseHistory } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

type UpdatableCaseHistoryData = Partial<Omit<StudentCaseHistory, 'id' | 'createdAt'>>;

export async function updateCaseHistory(clinicId: string, caseHistoryId: string, data: UpdatableCaseHistoryData): Promise<void> {
    if (!clinicId || !caseHistoryId) {
        throw new Error('Clinic ID and Case History ID are required to update.');
    }

    const docRef = doc(db, "clinics", clinicId, "studentCaseHistories", caseHistoryId);

    const payload = {
        ...data,
        updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(docRef, payload);
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

export async function deleteCaseHistory(clinicId: string, caseHistoryId: string): Promise<void> {
  if (!clinicId || !caseHistoryId) {
    throw new Error('Clinic ID and Case History ID are required to delete.');
  }

  const docRef = doc(db, "clinics", clinicId, "studentCaseHistories", caseHistoryId);

  try {
    await deleteDoc(docRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      throw error;
  }
}
