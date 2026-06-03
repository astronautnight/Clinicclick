
'use client';

import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, getDocs, writeBatch } from "firebase/firestore";
import type { Drug, UserProfile } from "@/types";
import { initializeFirebase } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { updateUserProfile } from './auth-service';

const { firestore: db } = initializeFirebase();

const commonDentalDrugs: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Analgesics / NSAIDs
  { genericName: "Aceclofenac + Paracetamol", brandName: "Zerodol-P, Vetory-P", dosageForm: "Tablet", strength: "100mg + 325mg", category: "Analgesic" },
  { genericName: "Aceclofenac + Paracetamol + Serratiopeptidase", brandName: "Zerodol-SP, Vetory-SP", dosageForm: "Tablet", strength: "100mg + 325mg + 15mg", category: "Analgesic" },
  { genericName: "Diclofenac Potassium", brandName: "Voveran-D", dosageForm: "Tablet", strength: "50mg", category: "NSAID" },
  { genericName: "Ibuprofen + Paracetamol", brandName: "Combiflam", dosageForm: "Tablet", strength: "400mg + 325mg", category: "Analgesic" },
  { genericName: "Ketorolac Tromethamine (oral)", brandName: "Ketorol-DT", dosageForm: "Tablet", strength: "10mg", category: "Analgesic" },
  { genericName: "Ketorolac (inj.)", brandName: "Torolac", dosageForm: "Injection", strength: "30mg/ml", category: "Analgesic" },
  { genericName: "Paracetamol", brandName: "Crocin, Calpol", dosageForm: "Tablet", strength: "500mg / 650mg", category: "Analgesic" },

  // Antibiotics
  { genericName: "Amoxicillin + Clavulanic Acid", brandName: "Augmentin, Clavam", dosageForm: "Tablet", strength: "625mg", category: "Antibiotic" },
  { genericName: "Amoxicillin + Clavulanic Acid (susp)", brandName: "Augmentin ES", dosageForm: "Syrup", strength: "457mg/5ml", category: "Antibiotic" },
  { genericName: "Cefixime", brandName: "Taxim-O, Suprax", dosageForm: "Tablet", strength: "200mg", category: "Antibiotic" },
  { genericName: "Cefuroxime Axetil", brandName: "Ceftum, Zocef", dosageForm: "Tablet", strength: "250mg / 500mg", category: "Antibiotic" },
  { genericName: "Metronidazole", brandName: "Flagyl, Metrogyl", dosageForm: "Tablet", strength: "400mg", category: "Antibiotic" },
  { genericName: "Azithromycin", brandName: "Azithral", dosageForm: "Tablet", strength: "500mg", category: "Antibiotic" },
  { genericName: "Ciprofloxacin", brandName: "Cifran", dosageForm: "Tablet", strength: "500mg", category: "Antibiotic" },
  { genericName: "Clindamycin", brandName: "Dalacin-C", dosageForm: "Capsule", strength: "300mg", category: "Antibiotic" },
  { genericName: "Ofloxacin + Ornidazole", brandName: "O2, Zanocin-OZ", dosageForm: "Tablet", strength: "200mg + 500mg", category: "Antibiotic" },

  // Local anesthetics
  { genericName: "Lignocaine (Lidocaine) + Adrenaline", brandName: "Lox 2%, Lignox-A", dosageForm: "Injection", strength: "2% + 1:80,000", category: "Local Anesthetic" },
  { genericName: "Articaine + Epinephrine", brandName: "Septanest, Ubistesin", dosageForm: "Injection", strength: "4% + 1:100,000", category: "Local Anesthetic" },
  { genericName: "Bupivacaine", brandName: "Sensorcaine", dosageForm: "Injection", strength: "0.5%", category: "Local Anesthetic" },

  // Steroids
  { genericName: "Dexamethasone", brandName: "Decdak, Dexona", dosageForm: "Tablet", strength: "0.5mg", category: "Steroid" }, 
  { genericName: "Methylprednisolone", brandName: "Medrol", dosageForm: "Tablet", strength: "4mg / 8mg", category: "Steroid" },
  { genericName: "Prednisolone", brandName: "Omnacortil", dosageForm: "Tablet", strength: "5mg / 10mg", category: "Steroid" },

  // Antiseptics / Oral rinses
  { genericName: "Chlorhexidine", brandName: "Hexidine, Rexidine", dosageForm: "Mouthwash", strength: "0.12% / 0.2%", category: "Antiseptic" },
  { genericName: "Povidone-Iodine", brandName: "Betadine", dosageForm: "Ointment", strength: "5% / 10%", category: "Antiseptic" },
  { genericName: "Benzocaine (topical)", brandName: "Orajel", dosageForm: "Gel", strength: "20%", category: "Local Anesthetic" },

  // Antifungals
  { genericName: "Fluconazole (oral)", brandName: "Flucon, Zocon", dosageForm: "Tablet", strength: "150mg", category: "Antifungal" },
  { genericName: "Itraconazole", brandName: "Canditral, Itrasys", dosageForm: "Capsule", strength: "100mg", category: "Antifungal" },
  { genericName: "Miconazole (oral gel)", brandName: "Daktarin", dosageForm: "Gel", strength: "20mg/g", category: "Antifungal" },
  { genericName: "Nystatin (oral suspension)", brandName: "Nilstat", dosageForm: "Syrup", strength: "100,000 IU/ml", category: "Antifungal" },
  { genericName: "Ketoconazole", brandName: "Nizoral", dosageForm: "Tablet", strength: "200mg", category: "Antifungal"},
  { genericName: "Clotrimazole (troche)", brandName: "Candid, Clotrim", dosageForm: "Other", strength: "10mg", category: "Antifungal"},

  // Antivirals
  { genericName: "Acyclovir", brandName: "Acivir", dosageForm: "Tablet", strength: "400mg / 800mg", category: "Antiviral" },
  { genericName: "Valacyclovir", brandName: "Valcivir", dosageForm: "Tablet", strength: "500mg", category: "Antiviral"},
  { genericName: "Famciclovir", brandName: "Famcivir", dosageForm: "Tablet", strength: "250mg", category: "Antiviral"},
  { genericName: "Oseltamivir", brandName: "Tamiflu", dosageForm: "Capsule", strength: "75mg", category: "Antiviral"},
  
  // Sedatives / anxiolytics
  { genericName: "Alprazolam", brandName: "Alprax, Restyl", dosageForm: "Tablet", strength: "0.25mg / 0.5mg", category: "Anxiolytic" },
  { genericName: "Diazepam", brandName: "Valium, Calmpose", dosageForm: "Tablet", strength: "5mg", category: "Anxiolytic" },
  { genericName: "Midazolam", brandName: "Mezolam", dosageForm: "Injection", strength: "1mg/ml, 5mg/ml", category: "Sedative"},
  { genericName: "Hydroxyzine", brandName: "Atarax", dosageForm: "Tablet", strength: "10mg / 25mg", category: "Sedative"},
  { genericName: "Promethazine", brandName: "Phenergan", dosageForm: "Tablet", strength: "25mg", category: "Sedative"},

  // Emergency drugs
  { genericName: "Adrenaline (Epinephrine)", brandName: "Adrenaline Inj", dosageForm: "Injection", strength: "1mg/ml", category: "Emergency" },
  { genericName: "Chlorpheniramine", brandName: "Avil", dosageForm: "Injection", strength: "10mg/ml", category: "Antihistamine" },
  { genericName: "Hydrocortisone (inj)", brandName: "Solu-Cortef", dosageForm: "Injection", strength: "100mg", category: "Emergency" },
  { genericName: "Salbutamol (inhaler)", brandName: "Asthalin", dosageForm: "Other", strength: "100mcg/actuation", category: "Emergency" },
  { genericName: "Nitroglycerin (sublingual)", brandName: "Nitrostat", dosageForm: "Tablet", strength: "0.5mg", category: "Emergency"},
  { genericName: "Aspirin (chewable)", brandName: "Ecosprin", dosageForm: "Tablet", strength: "325mg", category: "Emergency"},
  { genericName: "Atropine", brandName: "Atropine Sulfate", dosageForm: "Injection", strength: "0.6mg/ml", category: "Emergency"},
  { genericName: "Ipratropium + Salbutamol", brandName: "Duolin", dosageForm: "Other", strength: "—", category: "Emergency"},
  { genericName: "Glucose (oral)", brandName: "Glucose Powder", dosageForm: "Other", strength: "—", category: "Emergency"},
  { genericName: "Dextrose 25%", brandName: "Dextrose", dosageForm: "Injection", strength: "25%", category: "Emergency"},
  { genericName: "Intralipid 20%", brandName: "Intralipid", dosageForm: "Injection", strength: "20%", category: "Emergency" },
  
  // Supporting items
  { genericName: "Serratiopeptidase", brandName: "Serratio-D", dosageForm: "Tablet", strength: "10mg / 15mg", category: "Anti-inflammatory" },
  { genericName: "Trypsin-Chymotrypsin", brandName: "Chymoral Forte", dosageForm: "Tablet", strength: "—", category: "Anti-inflammatory" },
  { genericName: "Pantoprazole", brandName: "Pan-D, Pan 40", dosageForm: "Tablet", strength: "40mg", category: "Other" },
  { genericName: "Rabeprazole + Domperidone", brandName: "Razo-D", dosageForm: "Tablet", strength: "20mg + 10mg", category: "Other" },

  // Pediatric Drugs
  { genericName: "Paracetamol (pediatric syrup)", brandName: "Calpol", dosageForm: "Syrup", strength: "120mg/5ml", category: "Analgesic" },
  { genericName: "Ibuprofen (pediatric syrup)", brandName: "Brufen", dosageForm: "Syrup", strength: "100mg/5ml", category: "Analgesic" },
  { genericName: "Ibuprofen + Paracetamol (susp)", brandName: "Combiflam Suspension", dosageForm: "Syrup", strength: "100mg + 162.5mg per 5ml", category: "Analgesic" },
  { genericName: "Amoxicillin (suspension)", brandName: "Mox, Amoxil", dosageForm: "Syrup", strength: "125mg/5ml", category: "Antibiotic" },
  { genericName: "Cefixime (suspension)", brandName: "Taxim-O", dosageForm: "Syrup", strength: "50mg/5ml", category: "Antibiotic" },
  { genericName: "Azithromycin (suspension)", brandName: "Azithral", dosageForm: "Syrup", strength: "200mg/5ml", category: "Antibiotic" },
  { genericName: "Cetirizine (syrup)", brandName: "Cetzine", dosageForm: "Syrup", strength: "5mg/5ml", category: "Antihistamine" },
  { genericName: "Levocetirizine (syrup)", brandName: "Livcet", dosageForm: "Syrup", strength: "2.5mg/5ml", category: "Antihistamine" },
  { genericName: "ORS", brandName: "Electral", dosageForm: "Other", strength: "ORS", category: "Other" },
  { genericName: "Zinc syrup", brandName: "Zinconia", dosageForm: "Syrup", strength: "20mg/5ml", category: "Other" },
  { genericName: "Lidocaine topical", brandName: "Lignocaine gel", dosageForm: "Gel", strength: "2%", category: "Local Anesthetic" },
];

type UpdatableDrugData = Partial<Omit<Drug, 'id' | 'createdAt'>>;

function sanitizePayload<T extends object>(data: T): Partial<T> {
  const clean: any = {};
  for (const key in data) {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  }
  return clean;
}

export async function addDrug(clinicId: string, drugData: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to add a drug.');
  }
  
  const drugsColRef = collection(db, "clinics", clinicId, "drugs");
  
  const payload = sanitizePayload({
    ...drugData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await addDoc(drugsColRef, payload as any);
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: drugsColRef.path,
        operation: 'create',
        requestResourceData: payload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
  }
}

export async function updateDrug(clinicId: string, drugId: string, drugData: UpdatableDrugData): Promise<void> {
    if (!clinicId || !drugId) {
        throw new Error('Clinic ID and Drug ID are required to update a drug.');
    }

    const drugDocRef = doc(db, "clinics", clinicId, "drugs", drugId);

    const payload = sanitizePayload({
        ...drugData,
        updatedAt: serverTimestamp(),
    });

    try {
        await updateDoc(drugDocRef, payload);
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: drugDocRef.path,
                operation: 'update',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw error;
    }
}


export async function deleteDrug(clinicId: string, drugId: string): Promise<void> {
  if (!clinicId || !drugId) {
    throw new Error('Clinic ID and Drug ID are required to delete a drug.');
  }

  const drugDocRef = doc(db, "clinics", clinicId, "drugs", drugId);

  try {
    await deleteDoc(drugDocRef);
  } catch (error: any) {
      if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: drugDocRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
      throw error;
  }
}

export async function seedMissingDrugs(clinicId: string): Promise<void> {
  if (!clinicId) {
    throw new Error('Clinic ID is required to seed drugs.');
  }

  const drugsColRef = collection(db, "clinics", clinicId, "drugs");
  const snapshot = await getDocs(drugsColRef);
  const existingDrugs = snapshot.docs.map(doc => doc.data().genericName.toLowerCase());
  const existingDrugSet = new Set(existingDrugs);

  const missingDrugs = commonDentalDrugs.filter(
    (drug) => !existingDrugSet.has(drug.genericName.toLowerCase())
  );

  if (missingDrugs.length === 0) {
    console.log("No new drugs to add. Inventory is up to date.");
    const clinicDocRef = doc(db, "clinics", clinicId);
    await updateDoc(clinicDocRef, { seeded_v1_drugs: true });
    return;
  }

  const batch = writeBatch(db);
  missingDrugs.forEach((drugData) => {
    const docRef = doc(drugsColRef);
    const payload = {
      ...drugData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(docRef, payload);
  });

  try {
    await batch.commit();
    const clinicDocRef = doc(db, "clinics", clinicId);
    await updateDoc(clinicDocRef, { seeded_v1_drugs: true });
    console.log(`Added ${missingDrugs.length} new drugs to the clinic's inventory.`);
  } catch (error) {
    console.error("Error seeding missing drugs:", error);
    if ((error as any).code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
        path: drugsColRef.path,
        operation: 'create',
        requestResourceData: { note: "Batch write for seeding missing drugs." }
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  }
}

    