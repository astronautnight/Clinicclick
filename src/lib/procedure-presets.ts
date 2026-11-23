import type { Procedure, ProcedureSubStep } from '@/types';

type ProcedurePreset = Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>;

export const PROCEDURE_SUBPROCEDURES_MAP: Record<string, string[]> = {
  // 1. Root Canal Treatment – Premolar
  "Root Canal Treatment – Premolar": [
    "Access cavity preparation",
    "Working length determination",
    "Canal cleaning and shaping",
    "Obturation",
    "Temporary restoration"
  ],

  // 2. Fluoride Varnish
  "Fluoride Varnish": [
    "Pre-treatment examination",
    "Tooth surface preparation",
    "Fluoride varnish application"
  ],

  // 3. Single Implant Placement
  "Single Implant Placement": [
    "Pre-operative assessment and planning",
    "Surgical site preparation",
    "Implant placement",
    "Healing abutment / cover screw placement",
    "Post-operative evaluation"
  ],

  // 4. Pit and Fissure Sealant
  "Pit and Fissure Sealant": [
    "Tooth cleaning",
    "Tooth isolation and etching",
    "Sealant application",
    "Light curing",
    "Occlusal evaluation"
  ],

  // 5. Bitewing X-Ray (2 Films)
  "Bitewing X-Ray (2 Films)": [
    "Patient positioning",
    "Image exposure",
    "Image quality assessment",
    "Image interpretation"
  ],

  // 6. Bone Grafting
  "Bone Grafting": [
    "Pre-operative assessment",
    "Surgical site preparation",
    "Bone graft placement",
    "Membrane placement (if required)",
    "Suturing and follow-up"
  ],

  // 7. Root Canal Treatment – Anterior
  "Root Canal Treatment – Anterior": [
    "Access cavity preparation",
    "Working length determination",
    "Canal cleaning and shaping",
    "Obturation",
    "Temporary restoration"
  ],

  // 8. Ceramic Veneer
  "Ceramic Veneer": [
    "Shade selection",
    "Tooth preparation",
    "Impression / digital scan",
    "Veneer try-in",
    "Veneer bonding"
  ],

  // 9. Scaling and Polishing (Adult)
  "Scaling and Polishing (Adult)": [
    "Oral examination",
    "Scaling",
    "Calculus and stain removal",
    "Polishing",
    "Post-treatment instructions"
  ],

  // 10. IOPA X-Ray
  "IOPA X-Ray": [
    "Patient positioning",
    "Image exposure",
    "Image quality assessment",
    "Image interpretation"
  ],

  // 11. Impacted Third Molar Removal
  "Impacted Third Molar Removal": [
    "Pre-operative assessment",
    "Flap elevation",
    "Bone removal / tooth sectioning (if required)",
    "Tooth removal",
    "Suturing and post-operative care"
  ],

  // 12. Crown Preparation + Temporary Crown
  "Crown Preparation + Temporary Crown": [
    "Shade selection",
    "Tooth preparation",
    "Impression / digital scan",
    "Temporary crown fabrication",
    "Temporary crown cementation"
  ],

  // 13. Composite Filling – Posterior
  "Composite Filling – Posterior": [
    "Tooth isolation",
    "Caries removal and cavity preparation",
    "Bonding",
    "Composite placement and curing",
    "Finishing and occlusal adjustment"
  ],

  // 14. Root Canal Treatment – Molar
  "Root Canal Treatment – Molar": [
    "Access cavity preparation",
    "Working length determination",
    "Canal cleaning and shaping",
    "Obturation",
    "Temporary restoration"
  ],

  // 15. Space Maintainer
  "Space Maintainer": [
    "Space assessment",
    "Impression / digital scan",
    "Appliance fabrication",
    "Appliance fitting and placement",
    "Follow-up evaluation"
  ],

  // 16. Surgical Extraction
  "Surgical Extraction": [
    "Pre-operative assessment",
    "Flap elevation (if required)",
    "Bone removal / tooth sectioning (if required)",
    "Tooth removal",
    "Suturing and post-operative care"
  ],

  // 17. Comprehensive Oral Examination
  "Comprehensive Oral Examination": [
    "Medical and dental history review",
    "Extraoral and intraoral examination",
    "Periodontal examination",
    "Diagnosis",
    "Treatment planning"
  ],

  // 18. Temporary Restoration
  "Temporary Restoration": [
    "Tooth examination",
    "Cavity preparation",
    "Temporary material placement",
    "Contouring and occlusal evaluation"
  ],

  // 19. Periodic Oral Evaluation
  "Periodic Oral Evaluation": [
    "Medical and dental history update",
    "Intraoral examination",
    "Periodontal assessment",
    "Diagnosis",
    "Recommendations"
  ],

  // 20. Teeth Whitening (In-Office)
  "Teeth Whitening (In-Office)": [
    "Pre-treatment examination",
    "Shade recording",
    "Soft tissue protection",
    "Whitening gel application",
    "Final shade recording"
  ],

  // 21. Core Buildup
  "Core Buildup": [
    "Tooth isolation",
    "Remaining tooth structure assessment",
    "Post placement (if required)",
    "Core material placement",
    "Finishing and evaluation"
  ],

  // 22. Crown Re-Cementation
  "Crown Re-Cementation": [
    "Crown and tooth examination",
    "Cleaning and surface preparation",
    "Cement application",
    "Crown seating",
    "Occlusal evaluation"
  ],

  // 23. Simple Extraction
  "Simple Extraction": [
    "Pre-operative examination",
    "Local anesthesia",
    "Tooth luxation and extraction",
    "Socket inspection and hemostasis",
    "Post-operative instructions"
  ],

  // 24. Composite Filling – Anterior
  "Composite Filling – Anterior": [
    "Shade selection",
    "Tooth isolation and cavity preparation",
    "Bonding",
    "Composite layering and curing",
    "Finishing and polishing"
  ],

  // 25. OPG (Panoramic X-Ray)
  "OPG (Panoramic X-Ray)": [
    "Patient preparation and positioning",
    "Panoramic exposure",
    "Image quality assessment",
    "Image interpretation",
    "Report documentation"
  ]
};

/**
 * Normalizes a procedure name and looks up default preset sub-procedures.
 * Handles slight variations in hyphen, dashes, spacing, or case.
 */
export function getPresetSubProcedures(procedureName: string): string[] {
  if (!procedureName) return [];
  
  if (PROCEDURE_SUBPROCEDURES_MAP[procedureName]) {
    return [...PROCEDURE_SUBPROCEDURES_MAP[procedureName]];
  }

  const normalize = (str: string) =>
    str.toLowerCase().replace(/[\u2013\u2014\-]/g, '-').replace(/\s+/g, ' ').trim();

  const target = normalize(procedureName);
  for (const [key, steps] of Object.entries(PROCEDURE_SUBPROCEDURES_MAP)) {
    if (normalize(key) === target) {
      return [...steps];
    }
  }

  // Partial match if prefix or root matches
  for (const [key, steps] of Object.entries(PROCEDURE_SUBPROCEDURES_MAP)) {
    if (target.includes(normalize(key)) || normalize(key).includes(target)) {
      return [...steps];
    }
  }

  return [];
}

/**
 * Reconciles any existing sub-procedure steps with the current official preset.
 * Ensures old 11-12 step lists are automatically downsized to the new 3-5 step preset,
 * while preserving any matching completion status AND any doctor-added custom steps for that patient.
 */
export function reconcileSubProcedures(
  existingSteps: ProcedureSubStep[] | undefined | null,
  procedureName: string
): ProcedureSubStep[] {
  const preset = getPresetSubProcedures(procedureName);
  if (!preset || preset.length === 0) {
    return existingSteps || [];
  }

  // Preserve any custom steps added specifically for this patient!
  const customSteps: ProcedureSubStep[] = [];
  if (existingSteps) {
    for (const s of existingSteps) {
      if (s.isCustom) {
        customSteps.push(s);
      }
    }
  }

  // If existing steps already match preset length (ignoring custom steps) and step names match, return as-is
  if (existingSteps) {
    const nonCustomSteps = existingSteps.filter(s => !s.isCustom);
    if (nonCustomSteps.length === preset.length) {
      const isExact = nonCustomSteps.every(
        (s, i) => s.name.trim().toLowerCase() === preset[i].trim().toLowerCase()
      );
      if (isExact) return existingSteps;
    }
  }

  // Create a lookup for status, completedAt, and notes from existing steps
  const existingStepMap = new Map<string, { completed: boolean; completedAt?: string; notes?: string }>();
  if (existingSteps) {
    for (const s of existingSteps) {
      existingStepMap.set(s.name.trim().toLowerCase(), {
        completed: !!s.completed,
        completedAt: s.completedAt,
        notes: s.notes,
      });
    }
  }

  // Map to the new preset steps
  const baseSteps: ProcedureSubStep[] = preset.map(stepName => {
    const norm = stepName.trim().toLowerCase();
    const existingEntry = existingStepMap.get(norm) ||
      Array.from(existingStepMap.entries()).find(([k]) => k.includes(norm) || norm.includes(k))?.[1];
    return {
      name: stepName,
      completed: !!existingEntry?.completed,
      completedAt: existingEntry?.completedAt,
      notes: existingEntry?.notes,
    };
  });

  return [...baseSteps, ...customSteps];
}

export const MASTER_PROCEDURE_PRESET: ProcedurePreset[] = [
  {
    name: "Periodic Oral Evaluation",
    description: "Routine check-up to assess oral health.",
    category: "Consultation",
    cost: 300,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Mouth Mirror", "Explorer", "Cotton Pliers", "Patient Bib"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Periodic Oral Evaluation"]
  },
  {
    name: "Comprehensive Oral Examination",
    description: "Full-mouth examination with history and treatment planning.",
    category: "Consultation",
    cost: 600,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Mouth Mirror", "Explorer", "Periodontal Probe", "Patient Record Form", "Radiograph Viewer"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Comprehensive Oral Examination"]
  },
  {
    name: "IOPA X-Ray",
    description: "Single-tooth periapical radiograph.",
    category: "Consultation",
    cost: 150,
    durationMinutes: 7,
    isTemplate: true,
    materials: ["X-Ray Film/Sensor", "Film/Sensor Holder (RINN)", "Lead Apron", "X-Ray Machine"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["IOPA X-Ray"]
  },
  {
    name: "Bitewing X-Ray (2 Films)",
    description: "Interproximal caries detection radiographs.",
    category: "Consultation",
    cost: 250,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["X-Ray Film/Sensor", "Bitewing Tabs/Holders", "Lead Apron", "X-Ray Machine"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Bitewing X-Ray (2 Films)"]
  },
  {
    name: "OPG (Panoramic X-Ray)",
    description: "Full-arch panoramic radiograph.",
    category: "Consultation",
    cost: 600,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["OPG Machine", "Lead Apron", "Bite Peg Cover"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["OPG (Panoramic X-Ray)"]
  },
  {
    name: "Scaling and Polishing (Adult)",
    description: "Ultrasonic scaling and polishing of teeth.",
    category: "Preventive",
    cost: 1200,
    durationMinutes: 40,
    isTemplate: true,
    materials: ["Ultrasonic Scaler Tips", "Prophy Paste", "Prophy Cups/Brushes", "Saliva Ejector", "Mouth Mirror"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Scaling and Polishing (Adult)"]
  },
  {
    name: "Fluoride Varnish",
    description: "Topical fluoride application for caries prevention.",
    category: "Preventive",
    cost: 400,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["Fluoride Varnish Unit-dose", "Applicator Brush", "Cotton Rolls", "Saliva Ejector"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Fluoride Varnish"]
  },
  {
    name: "Pit and Fissure Sealant",
    description: "Sealant applied to prevent occlusal caries.",
    category: "Preventive",
    cost: 600,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Sealant Material", "Etchant Gel", "Bonding Agent", "Applicator Tips", "Curing Light"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Pit and Fissure Sealant"]
  },
  {
    name: "Composite Filling – Anterior",
    description: "Tooth-colored restoration for anterior tooth defects.",
    category: "Restorative",
    cost: 1400,
    durationMinutes: 45,
    isTemplate: true,
    materials: ["Local Anesthetic", "Composite Resin (Shade-matched)", "Etchant", "Bonding Agent", "Finishing & Polishing Discs/Strips"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Composite Filling – Anterior"]
  },
  {
    name: "Composite Filling – Posterior",
    description: "Tooth-colored restoration in posterior tooth.",
    category: "Restorative",
    cost: 1600,
    durationMinutes: 50,
    isTemplate: true,
    materials: ["Local Anesthetic", "Composite Resin", "Etchant", "Bonding Agent", "Matrix Bands & Wedges", "Curing Light"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Composite Filling – Posterior"]
  },
  {
    name: "Temporary Restoration",
    description: "Short-term protective restoration.",
    category: "Restorative",
    cost: 400,
    durationMinutes: 20,
    isTemplate: true,
    materials: ["Temporary Filling Material (e.g., ZOE, GIC)", "Excavator", "Condenser", "Mixing Pad & Spatula"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Temporary Restoration"]
  },
  {
    name: "Core Buildup",
    description: "Build-up of tooth structure before crown placement.",
    category: "Restorative",
    cost: 1200,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Core Buildup Material (Composite/GIC)", "Matrix Band", "Bonding Agent", "Curing Light"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Core Buildup"]
  },
  {
    name: "Crown Preparation + Temporary Crown",
    description: "Tooth preparation and temporary crown fabrication.",
    category: "Prosthodontic",
    cost: 9000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Diamond Burs for Crown Prep", "Retraction Cord", "Impression Material (e.g., PVS)", "Temporary Crown Material", "Temporary Cement"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Crown Preparation + Temporary Crown"]
  },
  {
    name: "Crown Re-Cementation",
    description: "Re-cementation of existing crown.",
    category: "Prosthodontic",
    cost: 500,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Permanent or Temporary Cement", "Mixing Pad & Spatula", "Explorer", "Scaler"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Crown Re-Cementation"]
  },
  {
    name: "Root Canal Treatment – Anterior",
    description: "Endodontic therapy for single-rooted anterior teeth.",
    category: "Endodontic",
    cost: 3500,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Root Canal Treatment – Anterior"]
  },
  {
    name: "Root Canal Treatment – Premolar",
    description: "Endodontic therapy for premolar teeth.",
    category: "Endodontic",
    cost: 4500,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Root Canal Treatment – Premolar"]
  },
  {
    name: "Root Canal Treatment – Molar",
    description: "Endodontic therapy for multi-rooted molars.",
    category: "Endodontic",
    cost: 6000,
    durationMinutes: 120,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Root Canal Treatment – Molar"]
  },
  {
    name: "Simple Extraction",
    description: "Non-surgical removal of tooth.",
    category: "Surgical",
    cost: 900,
    durationMinutes: 20,
    isTemplate: true,
    materials: ["Local Anesthetic", "Extraction Forceps", "Elevators", "Sterile Gauze"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Simple Extraction"]
  },
  {
    name: "Surgical Extraction",
    description: "Tooth removal requiring surgical access.",
    category: "Surgical",
    cost: 3000,
    durationMinutes: 40,
    isTemplate: true,
    materials: ["Local Anesthetic", "Surgical Handpiece & Burs", "Scalpel & Blade", "Sutures", "Bone File", "Sterile Saline"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Surgical Extraction"]
  },
  {
    name: "Impacted Third Molar Removal",
    description: "Surgical removal of impacted wisdom tooth.",
    category: "Surgical",
    cost: 7000,
    durationMinutes: 60,
    isTemplate: true,
    materials: ["Local Anesthetic", "Surgical Kit", "Sutures", "Sterile Gauze", "Irrigation Syringe", "Painkillers Prescription"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Impacted Third Molar Removal"]
  },
  {
    name: "Single Implant Placement",
    description: "Placement of titanium dental implant.",
    category: "Implantology",
    cost: 30000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Implant Surgical Kit", "Dental Implant & Healing Abutment", "Surgical Handpiece", "Sterile Drapes & Saline", "Sutures"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Single Implant Placement"]
  },
  {
    name: "Bone Grafting",
    description: "Grafting for ridge preservation or implant site preparation.",
    category: "Surgical",
    cost: 8000,
    durationMinutes: 45,
    isTemplate: true,
    materials: ["Bone Graft Material", "Membrane", "Surgical Instruments", "Sutures"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Bone Grafting"]
  },
  {
    name: "Teeth Whitening (In-Office)",
    description: "Professional bleaching treatment.",
    category: "Cosmetic",
    cost: 8000,
    durationMinutes: 60,
    isTemplate: true,
    materials: ["Whitening Gel (Hydrogen Peroxide)", "Gingival Barrier", "Retractors", "Curing Light/Laser"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Teeth Whitening (In-Office)"]
  },
  {
    name: "Ceramic Veneer",
    description: "Cosmetic veneer for smile correction.",
    category: "Cosmetic",
    cost: 15000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Veneer Preparation Kit", "Impression Material", "Shade Guide", "Temporary Veneer Material", "Bonding & Cementation Kit"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Ceramic Veneer"]
  },
  {
    name: "Space Maintainer",
    description: "Fixed or removable appliance to preserve space.",
    category: "Pediatric",
    cost: 3000,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Impression Material (Alginate)", "Band & Loop Components", "Cement (for fixed type)"],
    subProcedures: PROCEDURE_SUBPROCEDURES_MAP["Space Maintainer"]
  }
];
