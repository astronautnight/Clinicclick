

'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch, getDocs } from "firebase/firestore";
import type { Procedure } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { updateUserProfile } from "./auth-service";

const { firestore: db } = initializeFirebase();

type UpdatableProcedureData = Partial<Omit<Procedure, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'>>;

export async function addProcedure(clinicId: string, procedureData: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'>): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add a procedure.');
  }
  
  const proceduresColRef = collection(db, "clinics", clinicId, "procedures");
  
  const payload = {
    ...procedureData,
    materials: procedureData.materials || [],
    isTemplate: false, // User-added procedures are not templates
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  addDoc(proceduresColRef, payload).catch(error => {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: proceduresColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    } else {
        throw error;
    }
  });
}

export async function updateProcedure(clinicId: string, procedureId: string, procedureData: UpdatableProcedureData): Promise<void> {
    if (!clinicId || !procedureId) {
        throw new Error('Clinic ID and Procedure ID are required to update a procedure.');
    }

    const procedureDocRef = doc(db, "clinics", clinicId, "procedures", procedureId);

    const payload = {
        ...procedureData,
        materials: procedureData.materials || [],
        updatedAt: serverTimestamp(),
    };

    updateDoc(procedureDocRef, payload).catch(error => {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: procedureDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            throw error;
        }
    });
}


export async function deleteProcedure(clinicId: string, procedureId: string): Promise<void> {
  if (!clinicId || !procedureId) {
    throw new Error('Clinic ID and Procedure ID are required to delete a procedure.');
  }

  const procedureDocRef = doc(db, "clinics", clinicId, "procedures", procedureId);

  deleteDoc(procedureDocRef).catch(error => {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: procedureDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      } else {
        throw error;
      }
  });
}


export async function seedInitialProcedures(clinicId: string, masterProcedureList: Omit<Procedure, 'id'| 'createdAt' | 'updatedAt'>[]): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to seed procedures.');
  }

  // Seeding now happens at the clinic level
  const proceduresColRef = collection(db, "clinics", clinicId, "procedures");
  const snapshot = await getDocs(proceduresColRef);
  
  if (!snapshot.empty) {
      console.log("Procedures collection already exists for this clinic. Skipping seed.");
      return;
  }

  const batch = writeBatch(db);
  masterProcedureList.forEach((procedureData) => {
    const docRef = doc(proceduresColRef);
    const payload = {
      ...procedureData,
      isTemplate: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(docRef, payload);
  });

  try {
    await batch.commit();
    
    // We can't use updateUserProfile here as it is user-specific. 
    // Instead, we might set a flag on the clinic doc itself if needed.
    const clinicDocRef = doc(db, "clinics", clinicId);
    await updateDoc(clinicDocRef, { seeded_v1_procedures: true });
    
    console.log(`Added ${masterProcedureList.length} new procedures to clinic ${clinicId}.`);
  } catch (error) {
    console.error("Error seeding initial procedures:", error);
    if ((error as any).code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: proceduresColRef.path,
        operation: 'create',
        requestResourceData: { note: "Batch write for initial procedure seeding." }
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }
}
