
'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import type { MedicalEmergency } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { updateUserProfile } from "./auth-service";

const { firestore: db } = initializeFirebase();

const initialEmergencies: Omit<MedicalEmergency, 'id' | 'createdAt' | 'updatedAt'>[] = [
    { 
        name: "Syncope (Fainting)",
        description: "Partial or complete loss of consciousness caused by a temporary reduction in blood flow to the brain.",
        management: [
            "Position patient in supine (Trendelenburg) position with feet elevated.",
            "Ensure open airway. Loosen tight clothing.",
            "Monitor vital signs (pulse, blood pressure).",
            "Use ammonia inhalants (smelling salts) if needed.",
        ],
        drugs: ["Ammonia Inhalant"],
    },
    {
        name: "Anaphylaxis (Severe Allergic Reaction)",
        description: "A rapid, life-threatening allergic reaction. Can be triggered by anesthetics, antibiotics, or latex.",
        management: [
            "Administer Epinephrine (Adrenaline) 1:1000, 0.3-0.5 mg IM into the anterolateral thigh.",
            "Call for emergency medical services immediately.",
            "Administer 100% oxygen.",
            "Administer Antihistamine (e.g., Diphenhydramine/Chlorpheniramine) IM.",
            "Administer Corticosteroid (e.g., Hydrocortisone) IV/IM.",
        ],
        drugs: ["Epinephrine (Adrenaline) 1:1000", "Diphenhydramine / Chlorpheniramine", "Hydrocortisone"],
    },
    {
        name: "Hypoglycemia (Low Blood Sugar)",
        description: "Occurs when blood sugar levels fall too low, common in diabetic patients who have taken insulin but not eaten.",
        management: [
            "If conscious: Administer oral glucose (juice, sugar tablets, glucose gel).",
            "If unconscious: Administer 25% or 50% Dextrose IV or Glucagon IM. Do not give anything orally.",
            "Monitor blood glucose levels and vital signs.",
        ],
        drugs: ["Oral Glucose (gel, tablets)", "Dextrose 25%/50% IV", "Glucagon IM"],
    },
];


export async function addMedicalEmergency(clinicId: string, data: Omit<MedicalEmergency, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required.');
  
  const emergenciesColRef = collection(db, "clinics", clinicId, "medicalEmergencies");
  const payload = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };

  try {
    await addDoc(emergenciesColRef, payload);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: emergenciesColRef.path, operation: 'create', requestResourceData: payload,
      }));
    }
    throw error;
  }
}

export async function updateMedicalEmergency(clinicId: string, emergencyId: string, data: Partial<Omit<MedicalEmergency, 'id' | 'createdAt'>>): Promise<void> {
    if (!clinicId || !emergencyId) throw new Error('Clinic and Emergency ID are required.');

    const emergencyDocRef = doc(db, "clinics", clinicId, "medicalEmergencies", emergencyId);
    const payload = { ...data, updatedAt: serverTimestamp() };

    try {
        await updateDoc(emergencyDocRef, payload);
    } catch(error: any) {
        if (error.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: emergencyDocRef.path, operation: 'update', requestResourceData: payload,
            }));
        }
        throw error;
    }
}

export async function deleteMedicalEmergency(clinicId: string, emergencyId: string): Promise<void> {
  if (!clinicId || !emergencyId) throw new Error('Clinic and Emergency ID are required.');

  const emergencyDocRef = doc(db, "clinics", clinicId, "medicalEmergencies", emergencyId);

  try {
    await deleteDoc(emergencyDocRef);
  } catch(error: any) {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: emergencyDocRef.path, operation: 'delete' }));
      }
      throw error;
  }
}

export async function seedInitialEmergencies(clinicId: string): Promise<void> {
  if (!clinicId) throw new Error('Clinic ID is required.');
  
  const emergenciesColRef = collection(db, 'clinics', clinicId, 'medicalEmergencies');
  const batch = writeBatch(db);

  initialEmergencies.forEach(emergency => {
      const docRef = doc(emergenciesColRef);
      const payload = { ...emergency, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      batch.set(docRef, payload);
  });
  
  try {
      await batch.commit();
      const clinicDocRef = doc(db, 'clinics', clinicId);
      await updateDoc(clinicDocRef, { seeded_v1_emergencies: true });
      console.log('Initial medical emergencies seeded successfully for clinic.');
  } catch(error) {
      console.error('Error seeding emergencies:', error);
      if ((error as any).code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: emergenciesColRef.path, operation: 'create', requestResourceData: { note: "Batch write for seeding emergencies" }
        }));
      }
  }
}

    