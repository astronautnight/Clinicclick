
'use client';

import { collection, addDoc, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import type { Patient, Invoice, UserProfile, Doctor } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

const { firestore: db } = initializeFirebase();

interface GeneratedInvoiceData {
    patient: { id: string } & Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
    clinic: UserProfile;
    doctor?: Doctor | null;
    invoiceDate: string;
    totalAmount: number;
    gstAmount: number;
    finalAmount: number;
    gstRate: number;
}

export async function addInvoice(clinicId: string, invoiceData: GeneratedInvoiceData): Promise<string | void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add an invoice.');
  }
  
  const invoicesColRef = collection(db, "clinics", clinicId, "invoices");
  
  const payload: Omit<Invoice, 'id' | 'createdAt'> = {
    patientId: invoiceData.patient.id,
    invoiceDate: invoiceData.invoiceDate,
    totalAmount: invoiceData.totalAmount,
    gstAmount: invoiceData.gstAmount,
    finalAmount: invoiceData.finalAmount,
    gstRate: invoiceData.gstRate,
    patientDetails: {
      firstName: invoiceData.patient.firstName,
      lastName: invoiceData.patient.lastName,
      contactNumber: invoiceData.patient.contactNumber,
      dateOfBirth: invoiceData.patient.dateOfBirth,
      gender: invoiceData.patient.gender,
      address: invoiceData.patient.address,
      linkedProcedures: invoiceData.patient.linkedProcedures,
    } as any,
    clinicDetails: invoiceData.clinic,
    doctorDetails: invoiceData.doctor || undefined,
  };

  try {
    const docRef = await addDoc(invoicesColRef, { ...payload, createdAt: serverTimestamp() });
    return docRef.id;
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: invoicesColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function deleteInvoice(clinicId: string, invoiceId: string): Promise<void> {
  if (!clinicId || !invoiceId) {
    throw new Error('Clinic ID and Invoice ID are required to delete an invoice.');
  }

  const invoiceDocRef = doc(db, "clinics", clinicId, "invoices", invoiceId);

  try {
    await deleteDoc(invoiceDocRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: invoiceDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      throw error;
  }
}
