
'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Student, AttendanceStatus } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

type UpdatableStudentData = Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>;

export async function addStudent(clinicId: string, studentData: Omit<Student, 'id'>): Promise<string | void> {
  if (!clinicId) throw new Error('Clinic ID is required.');
  
  const studentsColRef = collection(db, "clinics", clinicId, "students");
  const payload = {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(studentsColRef, payload);
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: studentsColRef.path,
        operation: 'create',
        requestResourceData: payload,
      }));
    } else {
        throw error;
    }
  }
}

export async function updateStudent(clinicId: string, studentId: string, studentData: UpdatableStudentData): Promise<void> {
    if (!clinicId || !studentId) throw new Error('Clinic and Student ID are required.');

    const studentDocRef = doc(db, "clinics", clinicId, "students", studentId);
    const payload = { ...studentData, updatedAt: serverTimestamp() };

    try {
        await updateDoc(studentDocRef, payload);
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: studentDocRef.path, operation: 'update', requestResourceData: payload,
            }));
        }
        throw error;
    }
}


export async function deleteStudent(clinicId: string, studentId: string): Promise<void> {
  if (!clinicId || !studentId) throw new Error('Clinic and Student ID are required.');

  const studentDocRef = doc(db, "clinics", clinicId, "students", studentId);

  try {
    await deleteDoc(studentDocRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: studentDocRef.path, operation: 'delete' }));
      }
      throw error;
  }
}

export async function setStudentAttendance(clinicId: string, studentId: string, date: string, status: AttendanceStatus | undefined, departmentDetails?: { departmentId: string, departmentName: string }): Promise<void> {
    if (!clinicId || !studentId) throw new Error("Clinic and Student ID are required.");
    
    const attendanceDocRef = doc(db, "clinics", clinicId, "students", studentId, "attendance", date);

    try {
        if (status) {
            const payload: any = { status, date, updatedAt: serverTimestamp() };
            if (departmentDetails) {
                payload.departmentId = departmentDetails.departmentId;
                payload.departmentName = departmentDetails.departmentName;
            }
            await setDoc(attendanceDocRef, payload, { merge: true });
        } else {
            await deleteDoc(attendanceDocRef);
        }
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: attendanceDocRef.path,
                operation: status ? 'write' : 'delete',
                requestResourceData: status ? { status, ...departmentDetails } : undefined,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}
