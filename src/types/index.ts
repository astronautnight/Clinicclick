

import type { LucideIcon } from "lucide-react";

export type LucideIconName =
  | 'LayoutDashboard'
  | 'Users'
  | 'CalendarDays'
  | 'ClipboardList'
  | 'Stethoscope'
  | 'Pill'
  | 'DollarSign'
  | 'MessageSquare'
  | 'BookOpen'
  | 'Settings'
  | 'UserCircle'
  | 'Share2'
  | 'Sparkles' // Added for AI features
  | 'Archive' // Added for Inventory
  | 'HelpCircle' // Added as a potential fallback or general use icon
  | 'UsersRound'
  | 'ChevronRight'
  | 'Bell'
  | 'TrendingUp'
  | 'TrendingDown'
  | 'PersonStanding'
  | 'CalendarCheck'
  | 'CalendarX'
  | 'Edit'
  | 'Save'
  | 'History'
  | 'Printer'
  | 'Copy'
  | 'FileText'
  | 'View'
  | 'Search'
  | 'Hospital'
  | 'Upload'
  | 'BriefcaseMedical'
  | 'Wallet'
  | 'ShieldCheck'
  | 'Activity'
  | 'BarChart3';

export interface AdminClinic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  clinicType?: 'General' | 'Specialist' | 'Multi-specialty';
  inviteCode?: string;
  createdBy?: string;
  creatorEmail?: string;
  createdAt?: any;
  updatedAt?: any;
  logoUrl?: string;
  isFounder?: boolean;
  activeDates?: string[];
  membersCount?: number;
}

export interface AdminSurveyResponse {
  id: string;
  uid: string;
  email?: string;
  source: string;
  createdAt?: any;
}

export interface MarkedTooth {
  number: string; // e.g., "36"
  status: string; // The status for the whole tooth, e.g. "caries"
  notes?: string;
}

export interface LinkedProcedure {
  procedureId: string;
  procedureName: string;
  date: string; // ISO date string
  cost: number;
  toothNumber?: string;
  quantity?: number;
}

export interface Patient {
  id: string; // Firestore document ID
  firstName: string;
  lastName:string;
  dateOfBirth: string; // Should be string for input, can be Date object after parsing
  gender: 'Male' | 'Female' | 'Other';
  contactNumber: string;
  whatsappId?: string;
  email?: string;
  address?: string;
  occupation?: string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string;
  dentalHistory?: string;
  diagnosis?: string; 
  treatmentPlan?: string; 
  markedTeeth?: MarkedTooth[];
  photos?: File[] | string[]; 
  videos?: File[] | string[];
  xrays?: File[] | string[];
  scans?: File[] | string[];
  linkedProcedures?: LinkedProcedure[];
  createdAt: Date;
  updatedAt: Date;
  isConsult?: boolean; // Flag for consultation patient
  consultLocation?: string; // Location/clinic of the consult
  stagedObservations?: string[];
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string; // For display convenience
  doctorId?: string;
  doctorName?: string; // For display convenience
  date: string; // Storing as ISO string YYYY-MM-DD
  startTime: string; // Storing as string HH:mm
  endTime: string; // Storing as string HH:mm
  procedureIds?: string[];
  notes?: string;
  status: 'Scheduled' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Missed' | 'Postponed';
  createdAt: Date;
  updatedAt: Date;
  isConsult?: boolean; // Flag for consultation appointment
  consultLocation?: string; // Location/clinic of the consult
}

export type ProcedureCategory = 
  | 'Consultation' 
  | 'Restorative' 
  | 'Endodontic' 
  | 'Prosthodontic' 
  | 'Orthodontic' 
  | 'Surgical' 
  | 'Periodontic' 
  | 'Preventive' 
  | 'Cosmetic'
  | 'Pediatric'
  | 'Implantology'
  | 'Adjunctive'
  | 'Other';

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  category?: ProcedureCategory;
  cost: number; // in Rupees
  isTemplate: boolean; // If true, it's a default procedure
  durationMinutes?: number; // Estimated duration
  videoUrl?: string; // URL for a demo video
  materials?: string[]; // List of required materials/armamentarium
  createdAt: Date;
  updatedAt: Date;
}

export type DosageForm = 'Tablet' | 'Capsule' | 'Syrup' | 'Mouthwash' | 'Toothpaste' | 'Gel' | 'Ointment' | 'Injection' | 'Other';
export type DrugCategory = 
    | 'Analgesic' 
    | 'Antibiotic' 
    | 'Antiseptic' 
    | 'Anti-inflammatory' 
    | 'Fluoride' 
    | 'NSAID' 
    | 'Local Anesthetic' 
    | 'Antihistamine' 
    | 'Steroid'
    | 'Antifungal'
    | 'Antiviral'
    | 'Anxiolytic'
    | 'Sedative'
    | 'Emergency'
    | 'Other';


export interface Drug {
  id: string;
  genericName: string;
  brandName?: string;
  dosageForm: DosageForm;
  strength?: string; // e.g., "500mg", "0.2%"
  category?: DrugCategory;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescriptionItem {
  drugId: string;
  drugName?: string; // For display
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}
export interface Prescription {
  id: string;
  patientId: string; // Or patient name/details for simplicity in mock
  doctorId: string;   // Or doctor name
  date: string; // Date of prescription
  items: PrescriptionItem[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 'Earning' | 'Expense';
export type TransactionCategory = 
  | 'Consultation Fee' 
  | 'Procedure Payment' 
  | 'Lab Charges'
  | 'Supplies (Dental)'
  | 'Supplies (Office)'
  | 'Rent'
  | 'Salaries'
  | 'Utilities'
  | 'Equipment Maintenance'
  | 'Loan Payment'
  | 'Miscellaneous Income'
  | 'Miscellaneous Expense';

export type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Bank Transfer' | 'Other';


export interface Transaction {
  id: string;
  date: string; // Date of transaction
  type: TransactionType;
  category: TransactionCategory; 
  description?: string;
  amount: number; // in Rupees
  patientId?: string; // Link to patient if it's an earning
  paymentDate?: string;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  isConsult?: boolean; // Flag for consultation transaction
  consultLocation?: string; // Location/clinic of the consult
}

export interface UserProfile {
  id: string;
  uid: string;
  displayName: string | null;
  clinicName?: string;
  degree?: string;
  email: string | null;
  photoURL?: string | null;
  phoneNumber?: string;
  address?: string;
  specialization?: string;
  registrationNumber?: string;
  logoUrl?: string; // URL to clinic/doctor logo
  yearsOfExperience?: number;
  certifications?: string[];
  awards?: string[];
  createdAt: Date;
  updatedAt: Date;
  seeded_v1_drugs?: boolean; // Flag to check if initial drug list has been seeded
  seeded_v1_procedures?: boolean; // Flag to check if initial procedure list has been seeded
  seeded_v1_emergencies?: boolean; // Flag to check if initial emergencies list has been seeded
  clinicId?: string | null;
  role?: 'owner' | 'admin' | 'member' | null;
  heardAboutAppFrom?: string;
  notificationsEnabled?: boolean;
}

export interface EducationalVideo {
  id: string;
  title: string;
  description?: string;
  videoUrl: string; // URL to the video
  thumbnailUrl?: string;
  uploadedBy: string; // User ID or name
  createdAt: Date;
}

export interface NavItem {
  title: string;
  href: string;
  iconName: LucideIconName;
  color?: string; // For dashboard cards: Tailwind bg color class e.g. "bg-teal-500"
  iconColorClass?: string; // For dashboard card icons: Tailwind text color e.g. "text-teal-500"
  description: string; 
  disabled?: boolean;
}

export interface DashboardCardItem extends NavItem {
  stats?: {
    primary: number;
    consult?: number;
  };
  monthlyChange?: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string;
  registrationNumber?: string;
  contactNumber?: string;
  email?: string;
  description?: string;
  assignedPatients?: string[]; 
  assignedProcedures?: { patientId: string, procedureId: string }[];
  createdAt: Date;
  updatedAt: Date;
  color?:string;
  doctorType?: 'doctor' | 'activedoctor';
}

export type AttendanceStatus = 'Present' | 'Absent';

export interface StaffMember {
  id: string;
  name: string;
  role: 'Receptionist' | 'Dental Assistant' | 'Hygienist' | 'Office Manager' | 'Other';
  description?: string;
  contactNumber?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  patientId: string;
  invoiceDate: string; // ISO string
  totalAmount: number;
  gstAmount: number;
  finalAmount: number;
  gstRate: number;
  patientDetails: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>;
  clinicDetails: UserProfile;
  doctorDetails?: Doctor;
  createdAt: Date;
}

export interface Operatory {
  id: string;
  name: string;
  status: 'Available' | 'Occupied';
  currentPatientId?: string | null;
  currentPatientName?: string | null;
  createdAt: Date;
}


// AI Diagnosis specific types
export interface AIDiagnosisInput {
  symptoms: string;
  patientContext?: string;
}

export interface AIDiagnosisOutput {
  suggestedDiagnosis: string;
  suggestedTreatmentPlan: string;
  importantDisclaimer: string;
  confidence?: string;
}

export interface AIDiagnosisResult {
  success: boolean;
  data?: AIDiagnosisOutput;
  error?: string;
  title: string;
  message: string;
  variant?: 'default' | 'destructive';
}

export type InventoryCategory =
  | 'Infection Control'
  | 'Diagnostic & Examination'
  | 'Preventive Dentistry'
  | 'Restorative Dentistry'
  | 'Endodontics'
  | 'Periodontics'
  | 'Prosthodontics'
  | 'Oral Surgery'
  | 'Implantology'
  | 'Cosmetic Dentistry'
  | 'Lab & Impression'
  | 'Sterilization Supplies'
  | 'Miscellaneous';

export interface InventoryItem {
    id: string;
    name: string;
    category: InventoryCategory;
    quantity: number;
    reorderLevel: number;
    supplier?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface MedicalEmergency {
  id: string;
  name: string;
  description: string;
  management: string[];
  drugs: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
    id: string;
    name: string;
}

export interface Student {
    id: string;
    name: string;
    departmentId?: string;
    departmentName?: string;
}

export interface StudentCaseHistory {
  id: string;
  studentId: string;
  studentName: string; // for display convenience
  patientName: string;
  patientAge: number;
  patientGender: 'Male' | 'Female' | 'Other';
  chiefComplaint: string;
  medicalHistory: string;
  dentalHistory: string;
  examinationFindings: string;
  diagnosis: string;
  treatmentPlan: string;
  markedTeeth: MarkedTooth[];
  stagedObservations?: string[];
  clinicalPhotos?: string[];
  createdAt: any; 
  updatedAt: any;
  departmentId?: string;
  departmentName?: string;
}

export interface StudentFinancialEntry {
  id: string;
  studentId: string;
  type: 'Receivable' | 'Payable';
  description: string;
  amount: number;
  patientName?: string; // Optional, for receivables
  date: string; // ISO string
  createdAt: any;
}
