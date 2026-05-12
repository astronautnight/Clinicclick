
import type { Procedure } from '@/types';

type ProcedurePreset = Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>;

export const MASTER_PROCEDURE_PRESET: ProcedurePreset[] = [
  {
    name: "Periodic Oral Evaluation",
    description: "Routine check-up to assess oral health.",
    category: "Consultation",
    cost: 300,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Mouth Mirror", "Explorer", "Cotton Pliers", "Patient Bib"]
  },
  {
    name: "Comprehensive Oral Examination",
    description: "Full-mouth examination with history and treatment planning.",
    category: "Consultation",
    cost: 600,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Mouth Mirror", "Explorer", "Periodontal Probe", "Patient Record Form", "Radiograph Viewer"]
  },
  {
    name: "IOPA X-Ray",
    description: "Single-tooth periapical radiograph.",
    category: "Consultation",
    cost: 150,
    durationMinutes: 7,
    isTemplate: true,
    materials: ["X-Ray Film/Sensor", "Film/Sensor Holder (RINN)", "Lead Apron", "X-Ray Machine"]
  },
  {
    name: "Bitewing X-Ray (2 Films)",
    description: "Interproximal caries detection radiographs.",
    category: "Consultation",
    cost: 250,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["X-Ray Film/Sensor", "Bitewing Tabs/Holders", "Lead Apron", "X-Ray Machine"]
  },
  {
    name: "OPG (Panoramic X-Ray)",
    description: "Full-arch panoramic radiograph.",
    category: "Consultation",
    cost: 600,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["OPG Machine", "Lead Apron", "Bite Peg Cover"]
  },
  {
    name: "Scaling and Polishing (Adult)",
    description: "Ultrasonic scaling and polishing of teeth.",
    category: "Preventive",
    cost: 1200,
    durationMinutes: 40,
    isTemplate: true,
    materials: ["Ultrasonic Scaler Tips", "Prophy Paste", "Prophy Cups/Brushes", "Saliva Ejector", "Mouth Mirror"]
  },
  {
    name: "Fluoride Varnish",
    description: "Topical fluoride application for caries prevention.",
    category: "Preventive",
    cost: 400,
    durationMinutes: 10,
    isTemplate: true,
    materials: ["Fluoride Varnish Unit-dose", "Applicator Brush", "Cotton Rolls", "Saliva Ejector"]
  },
  {
    name: "Pit and Fissure Sealant",
    description: "Sealant applied to prevent occlusal caries.",
    category: "Preventive",
    cost: 600,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Sealant Material", "Etchant Gel", "Bonding Agent", "Applicator Tips", "Curing Light"]
  },
  {
    name: "Composite Filling – Anterior",
    description: "Tooth-colored restoration for anterior tooth defects.",
    category: "Restorative",
    cost: 1400,
    durationMinutes: 45,
    isTemplate: true,
    materials: ["Local Anesthetic", "Composite Resin (Shade-matched)", "Etchant", "Bonding Agent", "Finishing & Polishing Discs/Strips"]
  },
  {
    name: "Composite Filling – Posterior",
    description: "Tooth-colored restoration in posterior tooth.",
    category: "Restorative",
    cost: 1600,
    durationMinutes: 50,
    isTemplate: true,
    materials: ["Local Anesthetic", "Composite Resin", "Etchant", "Bonding Agent", "Matrix Bands & Wedges", "Curing Light"]
  },
  {
    name: "Temporary Restoration",
    description: "Short-term protective restoration.",
    category: "Restorative",
    cost: 400,
    durationMinutes: 20,
    isTemplate: true,
    materials: ["Temporary Filling Material (e.g., ZOE, GIC)", "Excavator", "Condenser", "Mixing Pad & Spatula"]
  },
  {
    name: "Core Buildup",
    description: "Build-up of tooth structure before crown placement.",
    category: "Restorative",
    cost: 1200,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Core Buildup Material (Composite/GIC)", "Matrix Band", "Bonding Agent", "Curing Light"]
  },
  {
    name: "Crown Preparation + Temporary Crown",
    description: "Tooth preparation and temporary crown fabrication.",
    category: "Prosthodontic",
    cost: 9000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Diamond Burs for Crown Prep", "Retraction Cord", "Impression Material (e.g., PVS)", "Temporary Crown Material", "Temporary Cement"]
  },
  {
    name: "Crown Re-Cementation",
    description: "Re-cementation of existing crown.",
    category: "Prosthodontic",
    cost: 500,
    durationMinutes: 15,
    isTemplate: true,
    materials: ["Permanent or Temporary Cement", "Mixing Pad & Spatula", "Explorer", "Scaler"]
  },
  {
    name: "Root Canal Treatment – Anterior",
    description: "Endodontic therapy for single-rooted anterior teeth.",
    category: "Endodontic",
    cost: 3500,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"]
  },
  {
    name: "Root Canal Treatment – Premolar",
    description: "Endodontic therapy for premolar teeth.",
    category: "Endodontic",
    cost: 4500,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"]
  },
  {
    name: "Root Canal Treatment – Molar",
    description: "Endodontic therapy for multi-rooted molars.",
    category: "Endodontic",
    cost: 6000,
    durationMinutes: 120,
    isTemplate: true,
    materials: ["Rubber Dam Kit", "Endo Access Burs", "Hand & Rotary Files", "Gutta Percha & Paper Points", "Root Canal Sealer", "NaOCl, EDTA"]
  },
  {
    name: "Simple Extraction",
    description: "Non-surgical removal of tooth.",
    category: "Surgical",
    cost: 900,
    durationMinutes: 20,
    isTemplate: true,
    materials: ["Local Anesthetic", "Extraction Forceps", "Elevators", "Sterile Gauze"]
  },
  {
    name: "Surgical Extraction",
    description: "Tooth removal requiring surgical access.",
    category: "Surgical",
    cost: 3000,
    durationMinutes: 40,
    isTemplate: true,
    materials: ["Local Anesthetic", "Surgical Handpiece & Burs", "Scalpel & Blade", "Sutures", "Bone File", "Sterile Saline"]
  },
  {
    name: "Impacted Third Molar Removal",
    description: "Surgical removal of impacted wisdom tooth.",
    category: "Surgical",
    cost: 7000,
    durationMinutes: 60,
    isTemplate: true,
    materials: ["Local Anesthetic", "Surgical Kit", "Sutures", "Sterile Gauze", "Irrigation Syringe", "Painkillers Prescription"]
  },
  {
    name: "Single Implant Placement",
    description: "Placement of titanium dental implant.",
    category: "Implantology",
    cost: 30000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Implant Surgical Kit", "Dental Implant & Healing Abutment", "Surgical Handpiece", "Sterile Drapes & Saline", "Sutures"]
  },
  {
    name: "Bone Grafting",
    description: "Grafting for ridge preservation or implant site preparation.",
    category: "Surgical",
    cost: 8000,
    durationMinutes: 45,
    isTemplate: true,
    materials: ["Bone Graft Material", "Membrane", "Surgical Instruments", "Sutures"]
  },
  {
    name: "Teeth Whitening (In-Office)",
    description: "Professional bleaching treatment.",
    category: "Cosmetic",
    cost: 8000,
    durationMinutes: 60,
    isTemplate: true,
    materials: ["Whitening Gel (Hydrogen Peroxide)", "Gingival Barrier", "Retractors", "Curing Light/Laser"]
  },
  {
    name: "Ceramic Veneer",
    description: "Cosmetic veneer for smile correction.",
    category: "Cosmetic",
    cost: 15000,
    durationMinutes: 90,
    isTemplate: true,
    materials: ["Veneer Preparation Kit", "Impression Material", "Shade Guide", "Temporary Veneer Material", "Bonding & Cementation Kit"]
  },
  {
    name: "Space Maintainer",
    description: "Fixed or removable appliance to preserve space.",
    category: "Pediatric",
    cost: 3000,
    durationMinutes: 30,
    isTemplate: true,
    materials: ["Impression Material (Alginate)", "Band & Loop Components", "Cement (for fixed type)"]
  }
];
