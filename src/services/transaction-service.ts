'use client';

import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import type { Transaction } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

function cleanFirestoreData(data: any): any {
  if (data === undefined) return null;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map(cleanFirestoreData).filter(item => item !== undefined);
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      cleaned[key] = cleanFirestoreData(val);
    }
  }
  return cleaned;
}

export async function addTransaction(
  clinicId: string,
  transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  if (!clinicId) throw new Error("Clinic ID is required");
  const colRef = collection(db, "clinics", clinicId, "transactions");
  const payload = cleanFirestoreData({
    ...transactionData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    const docRef = await addDoc(colRef, payload);
    return docRef.id;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: colRef.path,
        operation: 'create',
        requestResourceData: payload,
      }));
    }
    console.error("Error adding transaction:", error);
    return null;
  }
}

export async function updateTransaction(
  clinicId: string,
  transactionId: string,
  transactionData: Partial<Transaction>
): Promise<boolean> {
  if (!clinicId || !transactionId) return false;
  const docRef = doc(db, "clinics", clinicId, "transactions", transactionId);
  const { id, createdAt, ...rest } = transactionData;
  const payload = cleanFirestoreData({
    ...rest,
    updatedAt: serverTimestamp(),
  });

  try {
    await updateDoc(docRef, payload);
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'update',
        requestResourceData: payload,
      }));
    }
    console.error("Error updating transaction:", error);
    return false;
  }
}

export async function deleteTransaction(
  clinicId: string,
  transactionId: string
): Promise<boolean> {
  if (!clinicId || !transactionId) return false;
  const docRef = doc(db, "clinics", clinicId, "transactions", transactionId);
  try {
    await deleteDoc(docRef);
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      }));
    }
    console.error("Error deleting transaction:", error);
    return false;
  }
}
