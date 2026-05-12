
'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { StaffMember, AttendanceStatus } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

type UpdatableStaffData = Partial<Omit<StaffMember, 'id' | 'createdAt'>>;

export async function addStaffMember(clinicId: string, staffData: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add a staff member.');
  }
  
  const staffColRef = collection(db, "clinics", clinicId, "staff");
  
  const payload = {
    ...staffData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await addDoc(staffColRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: staffColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function updateStaffMember(clinicId: string, staffId: string, staffData: UpdatableStaffData): Promise<void> {
    if (!clinicId || !staffId) {
        throw new Error('Clinic ID and Staff ID are required to update a staff member.');
    }

    const staffDocRef = doc(db, "clinics", clinicId, "staff", staffId);

    const payload = {
        ...staffData,
        updatedAt: serverTimestamp(),
    };

    try {
        await updateDoc(staffDocRef, payload);
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: staffDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function deleteStaffMember(clinicId: string, staffId: string): Promise<void> {
  if (!clinicId || !staffId) {
    throw new Error('Clinic ID and Staff ID are required to delete a staff member.');
  }

  const staffDocRef = doc(db, "clinics", clinicId, "staff", staffId);

  try {
    await deleteDoc(staffDocRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: staffDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      throw error;
  }
}

export async function setAttendance(clinicId: string, staffId: string, date: string, status: AttendanceStatus | undefined): Promise<void> {
    if (!clinicId || !staffId) throw new Error("Clinic and Staff ID are required.");
    
    const attendanceDocRef = doc(db, "clinics", clinicId, "staff", staffId, "attendance", date);

    try {
        if (status) {
            await setDoc(attendanceDocRef, { status, date, updatedAt: serverTimestamp() });
        } else {
            // If status is undefined, delete the record for that day
            await deleteDoc(attendanceDocRef);
        }
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: attendanceDocRef.path,
                operation: status ? 'write' : 'delete',
                requestResourceData: status ? { status } : undefined,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}

    