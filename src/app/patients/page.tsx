'use client';

import { useState, useEffect, type ChangeEvent, type FormEvent, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { addPatient, deletePatient, updatePatient, uploadPatientFile, deletePatientPhoto } from "@/services/patient-service";
import { useUser, useFirestore } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { Filesystem } from '@capacitor/filesystem';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DentalChart } from "@/components/dental-chart";
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


import { Loader2, Trash2, UserPlus, ServerCrash, Users, Pencil, Link2, X, MapPin, Search, Check, Edit, Save, CalendarIcon, Upload, BriefcaseMedical, Wallet, FileText, Printer, Percent, Camera, ImagePlus, Eye } from "lucide-react";
import type { Patient, MarkedTooth, Procedure, ProcedureCategory, LinkedProcedure, Transaction, Prescription } from "@/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format, subYears, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";

const initialPatientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'videos' | 'linkedProcedures' | 'totalPaidOverride'> & { photos?: File[], videos?: File[] } = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "Other",
  contactNumber: "",
  whatsappId: "",
  email: "",
  address: "",
  occupation: "",
  bloodGroup: "",
  medicalHistory: "",
  dentalHistory: "",
  diagnosis: "",
  treatmentPlan: "",
  isConsult: false,
  consultLocation: "",
  markedTeeth: [],
  stagedObservations: [],
};




interface EditingProcedureState {
    patientId: string;
    procedureIndex: number;
}


function isPatient(docData: any): docData is Omit<Patient, "id"> {
  return (
    "firstName" in docData &&
    "lastName" in docData &&
    "dateOfBirth" in docData &&
    "gender" in docData &&
    "contactNumber" in docData
  );
}

export default function PatientsPage() {
  const { user, clinicId, loading, clinicLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const noClinic = user && !clinicId && !loading && !clinicLoading;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'videos' | 'linkedProcedures'> & { photos?: File[], videos?: File[] }>(initialPatientData);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientToLink, setPatientToLink] = useState<Patient | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [proceduresToLink, setProceduresToLink] = useState<string[]>([]);
  const [toothNumberToLink, setToothNumberToLink] = useState('');
  const [quantityToLink, setQuantityToLink] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('primary');
  const [editingProcedure, setEditingProcedure] = useState<EditingProcedureState | null>(null);
  const [age, setAge] = useState<number | string>('');

  const [discountPatient, setDiscountPatient] = useState<Patient | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValueState, setDiscountValueState] = useState<string>('');
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);

  // File Upload States
  const [pendingFiles, setPendingFiles] = useState<{ photos: File[], xrays: File[], scans: File[] }>({ photos: [], xrays: [], scans: [] });
  const [pendingUrls, setPendingUrls] = useState<{ photos: string[], xrays: string[], scans: string[] }>({ photos: [], xrays: [], scans: [] });
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadingForPatientId, setUploadingForPatientId] = useState<string | null>(null);
  const [uploadingFileType, setUploadingFileType] = useState<'photos' | 'xrays' | 'scans' | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string, type: 'photos' | 'xrays' | 'scans', index: number, patientId: string } | null>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>, fileType: 'photos' | 'xrays' | 'scans') => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: `"${f.name}" exceeds the 20 MB limit.`, variant: 'destructive' });
        return false;
      }
      if (fileType !== 'scans' && !f.type.startsWith('image/') && !f.name.endsWith('.dicom')) {
        toast({ title: 'Invalid file', description: `"${f.name}" is not supported for this field.`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;
    
    setPendingFiles(prev => ({ ...prev, [fileType]: [...prev[fileType], ...validFiles] }));
    const newUrls = validFiles.map(f => URL.createObjectURL(f));
    setPendingUrls(prev => ({ ...prev, [fileType]: [...prev[fileType], ...newUrls] }));
    if (e.target) e.target.value = '';
  };

  const removePendingFile = (index: number, fileType: 'photos' | 'xrays' | 'scans') => {
    URL.revokeObjectURL(pendingUrls[fileType][index]);
    setPendingFiles(prev => ({ ...prev, [fileType]: prev[fileType].filter((_, i) => i !== index) }));
    setPendingUrls(prev => ({ ...prev, [fileType]: prev[fileType].filter((_, i) => i !== index) }));
  };

  const handleDeleteExistingFile = async () => {
    if (!user || !clinicId || !previewFile) return;
    
    const { url, type, index, patientId } = previewFile;
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const existingFiles = (patient[type] as string[] || []);
    const updatedFiles = existingFiles.filter((_, i) => i !== index);

    // Call service to delete from storage
    await deletePatientPhoto(url); 

    const success = await updatePatient(clinicId, patientId, { [type]: updatedFiles });
    if (success) {
        toast({ title: 'Photo Deleted', description: 'The photo has been removed.' });
        setPreviewFile(null); // Close the dialog
    } else {
        toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const removeExistingFile = (index: number, fileType: 'photos' | 'xrays' | 'scans') => {
    setFormData(prev => ({
      ...prev,
      [fileType]: (prev[fileType] as string[] || []).filter((_, i) => i !== index),
    }));
  };

  const handleNativeFilePicker = async (context: 'form' | 'card', fileType: 'photos' | 'xrays' | 'scans', patientId?: string) => {
    if (!user || !clinicId) return;
    try {
      const images = await CapacitorCamera.pickImages({ quality: 90, limit: 5 });
      const fetchedFiles: File[] = [];
      for (let i = 0; i < images.photos.length; i++) {
        const photo = images.photos[i];
        let blob: Blob;
        try {
          if (photo.path) {
            const result = await Filesystem.readFile({ path: photo.path });
            const format = photo.format || 'jpeg';
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            const fetchRes = await fetch(`data:${mimeType};base64,${result.data}`);
            blob = await fetchRes.blob();
          } else if (photo.webPath) {
            const response = await fetch(photo.webPath);
            blob = await response.blob();
          } else continue;
        } catch (e: any) { continue; }
        
        try {
          const file = new File([blob], `${fileType}_${Date.now()}_${i}.${photo.format || 'jpg'}`, { type: blob.type || 'image/jpeg' });
          fetchedFiles.push(file);
        } catch (e: any) {
          (blob as any).name = `${fileType}_${Date.now()}_${i}.${photo.format || 'jpg'}`;
          fetchedFiles.push(blob as any);
        }
      }

      if (fetchedFiles.length === 0) return;

      if (context === 'form') {
        setPendingFiles(prev => ({ ...prev, [fileType]: [...prev[fileType], ...fetchedFiles] }));
        const newUrls = fetchedFiles.map(f => URL.createObjectURL(f));
        setPendingUrls(prev => ({ ...prev, [fileType]: [...prev[fileType], ...newUrls] }));
      } else if (context === 'card' && patientId) {
        setUploadingForPatientId(patientId);
        setUploadingFileType(fileType);
        const existingPatient = patients.find(p => p.id === patientId);
        const existingFiles = (existingPatient?.[fileType] || []) as string[];
        const newUrls: string[] = [];

        try {
          for (const file of fetchedFiles) {
            const url = await uploadPatientFile(clinicId, patientId, file, user.uid, fileType);
            if (url) newUrls.push(url);
          }
          if (newUrls.length > 0) {
            await updatePatient(clinicId, patientId, { [fileType]: [...existingFiles, ...newUrls] });
            toast({ title: 'Files uploaded', description: `${newUrls.length} file(s) added.` });
          }
        } catch (error: any) {
          toast({ title: "Upload Failed", description: error.message || "Failed to upload file.", variant: "destructive" });
        } finally {
          setUploadingForPatientId(null);
          setUploadingFileType(null);
        }
      }
    } catch(err: any) {
      if (err.message && err.message.includes('User cancelled')) return;
      toast({ title: 'Camera Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCardFileSelect = async (e: ChangeEvent<HTMLInputElement>, fileType: 'photos' | 'xrays' | 'scans', patientId: string) => {
    if (!user || !clinicId) return;
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (f.size > 20 * 1024 * 1024) {
        toast({ title: 'File too large', description: `"${f.name}" exceeds the 20 MB limit.`, variant: 'destructive' });
        return false;
      }
      if (fileType !== 'scans' && !f.type.startsWith('image/') && !f.name.endsWith('.dicom')) {
        toast({ title: 'Invalid file', description: `"${f.name}" is not supported for this field.`, variant: 'destructive' });
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    setUploadingForPatientId(patientId);
    setUploadingFileType(fileType);
    const existingPatient = patients.find(p => p.id === patientId);
    const existingFiles = (existingPatient?.[fileType] || []) as string[];
    const newUrls: string[] = [];

    try {
      for (const file of validFiles) {
        const url = await uploadPatientFile(clinicId, patientId, file, user.uid, fileType);
        if (url) newUrls.push(url);
      }
      if (newUrls.length > 0) {
        await updatePatient(clinicId, patientId, { [fileType]: [...existingFiles, ...newUrls] });
        toast({ title: 'Files uploaded', description: `${newUrls.length} file(s) added.` });
      }
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Failed to upload file.", variant: "destructive" });
    } finally {
      setUploadingForPatientId(null);
      setUploadingFileType(null);
      if (e.target) e.target.value = '';
    }
  };


  const handleOpenDiscountDialog = (patient: Patient) => {
    setDiscountPatient(patient);
    setDiscountType(patient.discountType || 'fixed');
    setDiscountValueState(patient.discountValue ? patient.discountValue.toString() : '');
    setIsDiscountDialogOpen(true);
  };

  const handleApplyDiscount = async () => {
    if (!user || !clinicId || !discountPatient) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const value = parseFloat(discountValueState) || 0;
    const success = await updatePatient(clinicId, discountPatient.id, {
      discountType: discountType,
      discountValue: value
    });

    if (success) {
      toast({ title: "Discount Applied", description: `Discount applied to ${discountPatient.firstName}.` });
      setIsDiscountDialogOpen(false);
    } else {
      toast({ title: "Error", description: "Could not apply discount to patient.", variant: "destructive" });
    }
  };


  useEffect(() => {
    if (!user || !db || !clinicId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const proceduresColRef = collection(db, "clinics", clinicId, "procedures");
    const unsubscribeProcedures = onSnapshot(proceduresColRef, (snapshot) => {
      const fetchedProcedures: Procedure[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      } as Procedure));
      setProcedures(fetchedProcedures.sort((a, b) => a.name.localeCompare(b.name)));
    }, (err) => {
      console.warn("Could not fetch procedures for linking:", err);
    });

    const patientsColRef = collection(db, "clinics", clinicId, "patients");
    const unsubscribePatients = onSnapshot(
      patientsColRef,
      (snapshot) => {
        const fetched: Patient[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (isPatient(data)) {
            fetched.push({
              id: d.id,
              ...data,
              createdAt: (data as any).createdAt?.toDate?.() || data.createdAt,
              updatedAt: (data as any).updatedAt?.toDate?.() || data.updatedAt,
            } as Patient);
          }
        });
        setPatients(fetched.sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)));
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: patientsColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Firestore Error on patients snapshot:", err);
        setError("Failed to fetch patients. Check permissions.");
        setIsLoading(false);
      }
    );

    const transactionsColRef = collection(db, "clinics", clinicId, "transactions");
    const unsubTransactions = onSnapshot(transactionsColRef, (snapshot) => {
        setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (err) => console.warn("Could not fetch transactions:", err));
    
    const prescriptionsColRef = collection(db, "clinics", clinicId, "prescriptions");
    const unsubPrescriptions = onSnapshot(prescriptionsColRef, (snapshot) => {
        setPrescriptions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Prescription)));
    }, (err) => console.warn("Could not fetch prescriptions:", err));


    return () => {
      unsubscribePatients();
      unsubscribeProcedures();
      unsubTransactions();
      unsubPrescriptions();
    };
  }, [user, db, clinicId]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({...prev, dateOfBirth: format(date, "yyyy-MM-dd")}))
    }
  }

  const handleSelectChange = (value: "Male" | "Female" | "Other") => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) setFormData((prev) => ({ ...prev, [name]: Array.from(files) }));
  };

  const handleTeethChange = async (patientId: string, teeth: MarkedTooth[]) => {
    if (!clinicId) return;
    const success = await updatePatient(clinicId, patientId, { markedTeeth: teeth });
    // Toast notifications are handled inside the dental chart for better user experience
  };
  
  const handleObservationsChange = async (patientId: string, observations: string[]) => {
    if (!clinicId) return;
    const success = await updatePatient(clinicId, patientId, { stagedObservations: observations });
    if (success) {
      toast({
        title: "Observations Updated",
        description: "The patient's staged observations have been saved.",
      });
    } else {
      toast({
        title: "Update Failed",
        description: "Could not save the observations.",
        variant: "destructive",
      });
    }
  };

  const openAddForm = () => {
    setEditingPatientId(null);
    setFormData(initialPatientData);
    setAge('');
    setPendingFiles({ photos: [], xrays: [], scans: [] });
    setPendingUrls({ photos: [], xrays: [], scans: [] });
    setIsFormOpen(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setFormData({
      ...initialPatientData,
      ...patient,
      markedTeeth: patient.markedTeeth || [],
      stagedObservations: patient.stagedObservations || [],
      photos: [],
      videos: [],
    });
    setAge(''); // Reset age field on edit
    setPendingFiles({ photos: [], xrays: [], scans: [] });
    setPendingUrls({ photos: [], xrays: [], scans: [] });
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db || !clinicId) {
      toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let success = false;
    let finalPatientId = editingPatientId;
    try {
      if (editingPatientId) {
        success = await updatePatient(clinicId, editingPatientId, formData);
        if (success) {
          toast({
            title: "Patient Updated",
            description: `${formData.firstName} ${formData.lastName} updated successfully.`,
          });
        }
      } else {
        const newId = await addPatient(clinicId, formData);
        if (newId) {
          success = true;
          finalPatientId = newId;
          toast({
            title: "Patient Added",
            description: `${formData.firstName} ${formData.lastName} added successfully.`,
          });
        }
      }

      // Handle pending files
      if (success && finalPatientId) {
        setIsUploadingPhotos(true);
        try {
          const types: ('photos' | 'xrays' | 'scans')[] = ['photos', 'xrays', 'scans'];
          for (const type of types) {
            if (pendingFiles[type].length > 0) {
              const newUrls: string[] = [];
              for (const file of pendingFiles[type]) {
                const url = await uploadPatientFile(clinicId, finalPatientId, file, user.uid, type);
                if (url) newUrls.push(url);
              }
              if (newUrls.length > 0) {
                const existingFiles = ((formData[type] as unknown as string[]) || []);
                await updatePatient(clinicId, finalPatientId, { [type]: [...existingFiles, ...newUrls] });
              }
            }
          }
        } catch (uploadErr: any) {
          console.error("File upload error:", uploadErr);
          toast({ title: "File Upload Failed", description: "Patient saved, but some files failed to upload.", variant: "destructive" });
        } finally {
          setIsUploadingPhotos(false);
        }
      }

      if (success) {
        setFormData(initialPatientData);
        setAge('');
        setIsFormOpen(false);
        setEditingPatientId(null);
        setPendingFiles({ photos: [], xrays: [], scans: [] });
        setPendingUrls({ photos: [], xrays: [], scans: [] });
      } else {
        toast({
          title: `Error ${editingPatientId ? 'Updating' : 'Adding'} Patient`,
          description: "An unexpected error occurred. The operation may have been blocked by security rules.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Error saving patient:", err);
      toast({
        title: `Error ${editingPatientId ? 'Updating' : 'Adding'} Patient`,
        description: err.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!user || !db || !patientToDelete?.id || !clinicId) return;

    const success = await deletePatient(clinicId, patientToDelete.id);

    if (success) {
      toast({
        title: "Patient Deleted",
        description: `${patientToDelete.firstName} ${patientToDelete.lastName} deleted.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Could not delete patient. Check security rules.",
        variant: "destructive",
      });
    }
    setPatientToDelete(null);
  };

  const handleLinkProcedure = async () => {
    if (!patientToLink || proceduresToLink.length === 0 || !user || !clinicId) {
      toast({ title: "Error", description: "Please select at least one procedure.", variant: "destructive" });
      return;
    }

    const selectedProcedures = procedures.filter(p => proceduresToLink.includes(p.id));
    if (selectedProcedures.length === 0) {
      toast({ title: "Error", description: "Selected procedures not found.", variant: "destructive" });
      return;
    }

    const newLinkedProcedures: LinkedProcedure[] = selectedProcedures.map(procedure => ({
      procedureId: procedure.id,
      procedureName: procedure.name,
      cost: procedure.cost,
      quantity: quantityToLink,
      date: new Date().toISOString(),
      ...(toothNumberToLink.trim() && { toothNumber: toothNumberToLink.trim() }),
    }));

    const updatedLinkedProcedures = [...(patientToLink.linkedProcedures || []), ...newLinkedProcedures];

    const success = await updatePatient(clinicId, patientToLink.id, { linkedProcedures: updatedLinkedProcedures });

    if (success) {
      toast({ title: "Procedures Linked", description: `${selectedProcedures.length} procedure(s) linked to ${patientToLink.firstName}. This will update their billable amount.` });
      setProceduresToLink([]);
      setToothNumberToLink('');
      setQuantityToLink(1);
      setIsLinkDialogOpen(false);
      setPatientToLink(null);
    } else {
      toast({ title: "Linking Failed", description: "Could not link procedures. Check security rules.", variant: "destructive" });
    }
  };

  const handleUnlinkProcedure = async (patient: Patient, procedureIndex: number) => {
    if (!user || !clinicId) return;

    const procedureToUnlink = patient.linkedProcedures?.[procedureIndex];
    if (!procedureToUnlink) return;

    const updatedProcedures = patient.linkedProcedures?.filter((_, index) => index !== procedureIndex);

    const success = await updatePatient(clinicId, patient.id, { linkedProcedures: updatedProcedures });

    if (success) {
      toast({ title: "Procedure Unlinked", description: `"${procedureToUnlink.procedureName}" has been removed from the patient's record.` });
    } else {
      toast({ title: "Unlinking Failed", description: "Could not unlink procedure.", variant: "destructive" });
    }
  };
  
  const handleOpenLinkDialog = (patient: Patient) => {
    setPatientToLink(patient);
    setIsLinkDialogOpen(true);
  };

  const handleSaveProcedureCost = async (patientId: string, procedureIndex: number, newCost: number) => {
    if (!user || !clinicId) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.linkedProcedures) return;

    const updatedProcedures = patient.linkedProcedures.map((proc, index) => {
      if (index === procedureIndex) {
        return { ...proc, cost: newCost };
      }
      return proc;
    });

    const success = await updatePatient(clinicId, patientId, { linkedProcedures: updatedProcedures });
    if (success) {
        toast({ title: "Procedure Cost Updated" });
    } else {
        toast({ title: "Update Failed", description: "Could not save the procedure cost.", variant: "destructive" });
    }
  };
  
  const handleSaveProcedureQuantity = async (patientId: string, procedureIndex: number, newQuantity: number) => {
    if (!user || !clinicId) return;
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.linkedProcedures) return;

    if (newQuantity < 1) {
        toast({ title: "Invalid Quantity", description: "Quantity cannot be less than 1.", variant: "destructive" });
        newQuantity = 1;
    }

    const updatedProcedures = patient.linkedProcedures.map((proc, index) => {
        if (index === procedureIndex) {
            return { ...proc, quantity: newQuantity };
        }
        return proc;
    });

    const success = await updatePatient(clinicId, patientId, { linkedProcedures: updatedProcedures });
    if (success) {
        toast({ title: "Procedure Quantity Updated" });
    } else {
         toast({ title: "Update Failed", variant: "destructive" });
    }
  };
  
  const handleSaveProcedureNotes = async (patientId: string, procedureIndex: number, newNotes: string) => {
    if (!user || !clinicId) return;
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.linkedProcedures) return;

    const updatedProcedures = patient.linkedProcedures.map((proc, index) => {
        if (index === procedureIndex) {
            return { ...proc, toothNumber: newNotes };
        }
        return proc;
    });

    const success = await updatePatient(clinicId, patientId, { linkedProcedures: updatedProcedures });
    if (success) {
        toast({ title: "Procedure Notes Updated" });
    } else {
        toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const handleAgeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newAge = e.target.value;
    setAge(newAge);
  };

  const handleAgeBlur = () => {
      const ageNum = parseInt(age as string, 10);
      if (!isNaN(ageNum) && ageNum > 0) {
        const birthDate = subYears(new Date(), ageNum);
        const formattedDate = format(new Date(birthDate.getFullYear(), 0, 1), 'yyyy-MM-dd');
        setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
        toast({
            title: "Date of Birth Calculated",
            description: `Set to ${formattedDate} based on age.`,
        });
      }
  };

  const filteredPatients = useMemo(() => {
    const isConsultList = activeTab === 'consults';
    return patients
      .filter(p => (p.isConsult || false) === isConsultList)
      .filter(p => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        const fullName = `${p.firstName.toLowerCase()} ${p.lastName.toLowerCase()}`;
        return fullName.includes(query) || (p.contactNumber && p.contactNumber.toLowerCase().includes(query));
      });
  }, [patients, searchQuery, activeTab]);

  const PatientDetailView = ({ patient }: { patient: Patient }) => {
    const patientTransactions = useMemo(() => transactions.filter(t => t.patientId === patient.id && t.type === 'Earning'), [transactions, patient.id]);
    const patientPrescriptions = useMemo(() => prescriptions.filter(p => p.patientId === patient.id), [prescriptions, patient.id]);
    
    const financials = useMemo(() => {
        const baseBillable = patient.linkedProcedures?.reduce((acc, proc) => acc + (proc.cost * (proc.quantity || 1)), 0) || 0;
        let discount = 0;
        if (patient.discountType === 'percentage' && patient.discountValue) {
            discount = (baseBillable * patient.discountValue) / 100;
        } else if (patient.discountType === 'fixed' && patient.discountValue) {
            discount = patient.discountValue;
        }
        const totalBillable = Math.max(0, baseBillable - discount);
        const totalPaid = patientTransactions.reduce((acc, t) => acc + t.amount, 0);
        const balanceDue = totalBillable - totalPaid;
        return { baseBillable, discountAmount: discount, totalBillable, totalPaid, balanceDue };
    }, [patient, patientTransactions]);
    
    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="px-1 sm:px-4 py-2 sm:py-4">
            {/* Patient Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5 sm:mb-6 no-print">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 shrink-0">
                        <AvatarImage src={undefined} />
                        <AvatarFallback className="text-xl sm:text-2xl">{patient.firstName?.[0]}{patient.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="text-xl sm:text-2xl font-bold">{patient.firstName} {patient.lastName}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">{patient.isConsult ? `Consult @ ${patient.consultLocation || 'N/A'}` : 'Primary Patient'}</p>
                        <div className="text-xs sm:text-sm mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                            <p><strong>DOB:</strong> {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd/MM/yyyy') : 'N/A'}</p>
                            <p><strong>Phone:</strong> {patient.contactNumber || 'N/A'}</p>
                            <p><strong>WhatsApp:</strong> {patient.whatsappId || 'N/A'}</p>
                            <p><strong>Email:</strong> {patient.email || 'N/A'}</p>
                            <p className="col-span-2"><strong>Address:</strong> {patient.address || 'N/A'}</p>
                            <p><strong>Gender:</strong> {patient.gender}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditForm(patient); }}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Edit Record
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={(e) => {e.stopPropagation(); setPatientToDelete(patient);}}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {patientToDelete?.firstName} {patientToDelete?.lastName}'s record.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel onClick={(e) => { e.stopPropagation(); setPatientToDelete(null); }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.stopPropagation(); handleDeletePatient(); }}>Delete</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Tabs defaultValue="dental-chart">
                {/* Tabs on full width on mobile with Print below. Side-by-side on laptop */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 no-print mb-4">
                    <div className="w-full sm:w-auto overflow-x-auto whitespace-nowrap pb-1 sm:pb-0">
                        <TabsList className="inline-flex w-max sm:w-auto">
                            <TabsTrigger value="dental-chart">Dental Chart</TabsTrigger>
                            <TabsTrigger value="history">
                                <BriefcaseMedical className="mr-1 h-4 w-4" />History
                            </TabsTrigger>
                            <TabsTrigger value="attachments">
                                <Upload className="mr-1 h-4 w-4" />Attachments
                            </TabsTrigger>
                            <TabsTrigger value="billing">
                                <Wallet className="mr-1 h-4 w-4" />Billing
                            </TabsTrigger>
                            <TabsTrigger value="prescriptions">
                                <FileText className="mr-1 h-4 w-4" />Prescriptions
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="flex justify-end sm:block">
                        <Button variant="outline" onClick={handlePrint} className="no-print">
                            <Printer className="mr-2 h-4 w-4" />Print
                        </Button>
                    </div>
                </div>
                <TabsContent value="dental-chart" className="mt-4">
                    <DentalChart
                        markedTeeth={patient.markedTeeth || []}
                        onTeethChange={(teeth) => handleTeethChange(patient.id, teeth)}
                        stagedObservations={patient.stagedObservations || []}
                        onObservationsChange={(observations) => handleObservationsChange(patient.id, observations)}
                    />
                </TabsContent>
                <TabsContent value="history" className="mt-4">
                    <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
                        <CardContent className="p-0 sm:p-6 space-y-4">
                            <div><h4 className="font-semibold">Medical History</h4><p className="text-muted-foreground">{patient.medicalHistory || 'No medical history recorded.'}</p></div>
                            <div><h4 className="font-semibold">Allergies</h4><p className="text-muted-foreground">{patient.allergies || 'No allergies recorded.'}</p></div>
                            <Separator/>
                            <div><h4 className="font-semibold">Dental History</h4><p className="text-muted-foreground">{patient.dentalHistory || 'No dental history recorded.'}</p></div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="attachments" className="mt-4">
                  <Card className="border-none shadow-none bg-transparent">
                    <CardContent className="p-0 space-y-6">
                      {[
                        { type: 'photos', label: 'Patient Photos' },
                        { type: 'xrays', label: 'X-Rays / Radiographs' },
                        { type: 'scans', label: 'Intraoral Scans' }
                      ].map(({ type, label }) => {
                        const fileType = type as 'photos' | 'xrays' | 'scans';
                        const existingFiles = (patient[fileType] as string[] || []);
                        const isUploadingThis = uploadingForPatientId === patient.id && uploadingFileType === fileType;

                        return (
                          <div key={fileType}>
                            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">{label}</p>
                            <div className="flex flex-wrap items-center gap-2">
                                {existingFiles.map((url, i) => (
                                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors bg-muted">
                                        <button type="button" onClick={() => setPreviewFile({ url, type: fileType, index: i, patientId: patient.id })} className="block w-full h-full focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer">
                                            <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
                                        </button>
                                    </div>
                                ))}
                                {/* Add file button */}
                                <div className="relative">
                                    <input
                                        id={`card-upload-${fileType}-${patient.id}`}
                                        type="file"
                                        accept={fileType === 'scans' ? '.ply,.obj,.stl' : 'image/*,.dicom'}
                                        multiple
                                        className="hidden"
                                        onChange={(e) => handleCardFileSelect(e, fileType, patient.id)}
                                    />
                                    <label
                                        htmlFor={`card-upload-${fileType}-${patient.id}`}
                                        onClick={(e) => {
                                             if (Capacitor.isNativePlatform() && fileType !== 'scans') {
                                                e.preventDefault();
                                                handleNativeFilePicker('card', fileType, patient.id);
                                            }
                                        }}
                                        className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                                    >
                                        {isUploadingThis ? (
                                            <span className="text-xs text-muted-foreground animate-pulse">...</span>
                                        ) : (
                                            <>
                                                <Camera className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                {existingFiles.length === 0 && !isUploadingThis && (
                                    <span className="text-xs text-muted-foreground">No {label.toLowerCase()} yet</span>
                                )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
                <TabsContent value="billing" className="mt-4">
                     <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
                        <CardHeader className="px-0 sm:px-6">
                            <CardTitle>Billing Summary</CardTitle>
                             {/* Financial summary — 2-col grid on mobile, flex-wrap on larger */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-around pt-2 text-center gap-3">
                                {financials.discountAmount > 0 && (
                                    <div>
                                        <p className="text-lg sm:text-2xl font-bold text-muted-foreground line-through">₹{financials.baseBillable.toLocaleString()}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Base Billable</p>
                                    </div>
                                )}
                                {financials.discountAmount > 0 && (
                                    <div>
                                        <p className="text-lg sm:text-2xl font-bold text-red-600">-₹{financials.discountAmount.toLocaleString()}</p>
                                        <p className="text-xs sm:text-sm text-muted-foreground">Discount ({patient.discountType === 'percentage' ? `${patient.discountValue}%` : 'Fixed'})</p>
                                    </div>
                                )}
                                <div><p className="text-lg sm:text-2xl font-bold">₹{financials.totalBillable.toLocaleString()}</p><p className="text-xs sm:text-sm text-muted-foreground">Billable</p></div>
                                <div><p className="text-lg sm:text-2xl font-bold text-green-600">₹{financials.totalPaid.toLocaleString()}</p><p className="text-xs sm:text-sm text-muted-foreground">Paid</p></div>
                                <div className="col-span-2 sm:col-span-1"><p className="text-lg sm:text-2xl font-bold text-red-600">₹{financials.balanceDue.toLocaleString()}</p><p className="text-xs sm:text-sm text-muted-foreground">Balance Due</p></div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            <div className="flex flex-wrap justify-end gap-2 mb-3">
                                <Button variant="outline" size="sm" className="text-xs h-8" onClick={(e) => { e.stopPropagation(); handleOpenDiscountDialog(patient); }}><Percent className="mr-1 h-3.5 w-3.5" />Discount</Button>
                                <Button variant="outline" size="sm" className="text-xs h-8" onClick={(e) => { e.stopPropagation(); handleOpenLinkDialog(patient); }}><Link2 className="mr-1 h-3.5 w-3.5" />Link Procedure</Button>
                            </div>
                            {/* Mobile-friendly procedure list */}
                            <div className="space-y-2 sm:hidden">
                                {(patient.linkedProcedures || []).map((proc, index) => (
                                    <div key={index} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{proc.procedureName}</p>
                                            <p className="text-xs text-muted-foreground">{proc.toothNumber ? `Tooth: ${proc.toothNumber} · ` : ''}Qty: {proc.quantity || 1}</p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-sm font-semibold">₹{(proc.cost * (proc.quantity || 1)).toLocaleString()}</span>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleUnlinkProcedure(patient, index);}}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                                        </div>
                                    </div>
                                ))}
                                {(!patient.linkedProcedures || patient.linkedProcedures.length === 0) && <p className="text-center text-muted-foreground py-4 text-sm">No procedures billed yet.</p>}
                            </div>
                            {/* Desktop table */}
                            <div className="hidden sm:block">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Procedure</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {(patient.linkedProcedures || []).map((proc, index) => (
                                            <TableRow key={index}><TableCell>{proc.procedureName} {proc.toothNumber && `(${proc.toothNumber})`}</TableCell><TableCell>{proc.quantity || 1}</TableCell><TableCell className="text-right">₹{(proc.cost * (proc.quantity || 1)).toLocaleString()}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleUnlinkProcedure(patient, index);}}><X className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {(!patient.linkedProcedures || patient.linkedProcedures.length === 0) && <p className="text-center text-muted-foreground pt-4">No procedures billed yet.</p>}
                            </div>
                        </CardContent>
                     </Card>
                </TabsContent>
                <TabsContent value="prescriptions" className="mt-4">
                     <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
                        <CardHeader className="px-0 sm:px-6"><CardTitle>Prescription History</CardTitle></CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            {patientPrescriptions.length > 0 ? (
                                <Table>
                                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Medications</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {patientPrescriptions.map(presc => (
                                        <TableRow key={presc.id}>
                                            <TableCell>{format(new Date(presc.date), 'dd/MM/yyyy')}</TableCell>
                                            <TableCell>{presc.items.map(i => i.drugName).join(', ')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                </Table>
                            ) : <p className="text-center text-muted-foreground">No prescriptions found.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
  }

  const renderPatientList = () => {
    if (filteredPatients.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-6 min-h-[150px]">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">No patients found.</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? "Try adjusting your search." : `No patients in this category yet.`}
          </p>
        </div>
      );
    }
    
    return (
      <Accordion type="multiple" className="space-y-2">
        {filteredPatients.map((patient) => (
            <AccordionItem value={patient.id} key={patient.id} className="border-b sm:border-b-0 border-border/50">
                <Card className={cn(
                    "border-0 sm:border shadow-none sm:shadow-sm rounded-none sm:rounded-lg bg-transparent sm:bg-card",
                    patient.isConsult ? "sm:border-accent" : ""
                )}>
                    <AccordionTrigger className="px-1 py-3 sm:p-4 hover:no-underline w-full no-print">
                      <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-3 sm:gap-4 text-left min-w-0">
                              <Avatar className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                                <AvatarImage src={undefined} />
                                <AvatarFallback className="text-sm">{patient.firstName?.[0]}{patient.lastName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-sm sm:text-base truncate">{patient.firstName} {patient.lastName}</div>
                                <div className="text-xs sm:text-sm text-muted-foreground truncate">{patient.contactNumber}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                              {patient.isConsult && <Badge variant="outline" className="border-accent text-accent text-xs">Consult</Badge>}
                          </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 sm:px-0">
                        <PatientDetailView patient={patient} />
                    </AccordionContent>
                </Card>
            </AccordionItem>
        ))}
      </Accordion>
    );
  };
  
  const renderContent = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading patients...</p>
        </div>
      );

    if (noClinic)
      return <ClinicSetupAlert sectionName="Patients" />;

    if (error)
      return (
        <Alert variant="destructive">
          <ServerCrash className="h-5 w-5" />
          <AlertTitle>Database Error</AlertTitle>
          <ShadAlertDescription>{error}</ShadAlertDescription>
        </Alert>
      );

    if (!user)
      return (
        <div className="flex flex-col items-center justify-center text-center p-6 min-h-[150px] border rounded-lg bg-muted/30">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-2">Please log in.</p>
        </div>
      );
      
    return renderPatientList();
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
          <Users className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-special1" />
          Patient Management
        </h1>
        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingPatientId(null);
            setFormData(initialPatientData);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} disabled={!user || !clinicId} className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
              <UserPlus className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="sm:hidden">Add Patient</span>
              <span className="hidden sm:inline">Add New Patient</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>{editingPatientId ? 'Edit Patient Details' : 'Add New Patient'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the patient.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-4">

                {/* Personal Details */}
                <fieldset className="border-t pt-4">
                  <legend className="text-lg font-medium mb-4">Personal Details</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="firstName">First Name *</Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="lastName">Last Name *</Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required disabled={isSubmitting} /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                            <Popover><PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal",!formData.dateOfBirth && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{formData.dateOfBirth ? format(new Date(formData.dateOfBirth), 'dd/MM/yyyy') : <span>Pick a date</span>}
                                </Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined} onSelect={handleDateChange} captionLayout="dropdown-buttons" fromYear={1930} toYear={new Date().getFullYear()} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2"><Label htmlFor="age">or Age (in years)</Label><Input id="age" name="age" type="number" value={age} onChange={handleAgeChange} onBlur={handleAgeBlur} placeholder="e.g., 35" disabled={isSubmitting} /></div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <Select name="gender" value={formData.gender} onValueChange={handleSelectChange} disabled={isSubmitting}><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="contactNumber">Contact Number *</Label><Input id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="whatsappId">WhatsApp ID (Optional)</Label><Input id="whatsappId" name="whatsappId" value={formData.whatsappId || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="email">Email (Optional)</Label><Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="address">Address (Optional)</Label><Textarea id="address" name="address" value={formData.address || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="occupation">Occupation (Optional)</Label><Input id="occupation" name="occupation" value={formData.occupation || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="bloodGroup">Blood Group (Optional)</Label><Input id="bloodGroup" name="bloodGroup" value={formData.bloodGroup || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                  </div>
                  <div className="flex items-start space-x-2 mt-4"><Checkbox id="isConsult" checked={formData.isConsult} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isConsult: !!checked }))} /><div className="grid gap-1.5 leading-none"><Label htmlFor="isConsult">This is a consultation patient from another clinic</Label></div></div>
                   {formData.isConsult && (<div className="space-y-2 pl-6 pt-2"><Label htmlFor="consultLocation">Consult Location / Clinic Name</Label><Input id="consultLocation" name="consultLocation" value={formData.consultLocation || ''} onChange={handleInputChange} placeholder="e.g., City General Hospital" /></div>)}
                </fieldset>

                <fieldset className="border-t pt-4">
                  <legend className="text-lg font-medium mb-4">Medical & Dental History</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="allergies">Allergies (Optional)</Label><Textarea id="allergies" name="allergies" value={formData.allergies || ''} onChange={handleInputChange} disabled={isSubmitting} placeholder="e.g., Penicillin, Latex" /></div>
                    <div className="space-y-2"><Label htmlFor="medicalHistory">Medical History (Optional)</Label><Textarea id="medicalHistory" name="medicalHistory" value={formData.medicalHistory || ''} onChange={handleInputChange} disabled={isSubmitting} placeholder="e.g., Diabetes, Hypertension" /></div>
                    <div className="space-y-2 md:col-span-2"><Label htmlFor="dentalHistory">Dental History (Optional)</Label><Textarea id="dentalHistory" name="dentalHistory" value={formData.dentalHistory || ''} onChange={handleInputChange} disabled={isSubmitting} placeholder="e.g., Previous extractions, braces" /></div>
                  </div>
                </fieldset>

                <fieldset className="border-t pt-4">
                  <legend className="text-lg font-medium mb-4">Diagnosis & Treatment Plan</legend>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label htmlFor="diagnosis">Diagnosis</Label><Textarea id="diagnosis" name="diagnosis" value={formData.diagnosis || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    <div className="space-y-2"><Label htmlFor="treatmentPlan">Treatment Plan</Label><Textarea id="treatmentPlan" name="treatmentPlan" value={formData.treatmentPlan || ''} onChange={handleInputChange} disabled={isSubmitting} /></div>
                    
                    <div className="space-y-2 pt-4">
                      <Label>Initial Dental Chart</Label>
                      <div className="border rounded-md p-2 sm:p-4 bg-slate-50/50 dark:bg-[#1C1C1C] overflow-hidden max-w-full">
                        <DentalChart
                          markedTeeth={formData.markedTeeth || []}
                          onTeethChange={(teeth) => setFormData(prev => ({ ...prev, markedTeeth: teeth }))}
                          stagedObservations={formData.stagedObservations || []}
                          onObservationsChange={(obs) => setFormData(prev => ({ ...prev, stagedObservations: obs }))}
                        />
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="border-t pt-4">
                  <legend className="text-lg font-medium mb-4">Patient Files</legend>
                  <div className="space-y-6">
                    {[
                      { type: 'photos', label: 'Patient Photos', desc: 'Max 5 MB per image. JPG, PNG, WebP supported.' },
                      { type: 'xrays', label: 'X-Rays / Radiographs', desc: 'Max 5 MB per image. JPG, PNG, DICOM supported.' },
                      { type: 'scans', label: 'Intraoral Scans', desc: 'Max 20 MB per file. PLY, OBJ, STL supported.' }
                    ].map(({ type, label, desc }) => {
                      const fileType = type as 'photos' | 'xrays' | 'scans';
                      const existingUrls = (formData[fileType] as unknown as string[]) || [];
                      const pendingTypeUrls = pendingUrls[fileType] || [];
                      
                      return (
                        <div key={fileType} className="space-y-4">
                          <h4 className="text-sm font-semibold">{label}</h4>
                          {/* Existing files */}
                          {existingUrls.length > 0 && (
                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground font-semibold uppercase">Saved files</Label>
                                  <div className="flex flex-wrap gap-2">
                                      {existingUrls.map((url, i) => (
                                          <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
                                              <img src={url} alt={`${label} ${i + 1}`} className="w-full h-full object-cover" />
                                              <button
                                                  type="button"
                                                  onClick={() => removeExistingFile(i, fileType)}
                                                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                  <X className="h-3 w-3" />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {/* Pending files */}
                          {pendingTypeUrls.length > 0 && (
                              <div className="space-y-2">
                                  <Label className="text-xs text-muted-foreground font-semibold uppercase">New files (unsaved)</Label>
                                  <div className="flex flex-wrap gap-2">
                                      {pendingTypeUrls.map((url, i) => (
                                          <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-muted">
                                              <img src={url} alt={`New ${label} ${i + 1}`} className="w-full h-full object-cover" />
                                              <button
                                                  type="button"
                                                  onClick={() => removePendingFile(i, fileType)}
                                                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                              >
                                                  <X className="h-3 w-3" />
                                              </button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}
                          {/* Upload button */}
                          <input
                              id={`${fileType}-upload-input`}
                              type="file"
                              accept={fileType === 'scans' ? '.ply,.obj,.stl' : 'image/*,.dicom'}
                              multiple
                              className="hidden"
                              onChange={(e) => handleFileSelect(e, fileType)}
                          />
                          <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                  if (Capacitor.isNativePlatform() && fileType !== 'scans') {
                                      handleNativeFilePicker('form', fileType);
                                  } else {
                                      document.getElementById(`${fileType}-upload-input`)?.click();
                                  }
                              }}
                              className="gap-2"
                          >
                              <ImagePlus className="h-4 w-4" />
                              Add {fileType}
                          </Button>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <DialogFooter className="border-t pt-4">
                <DialogClose asChild><Button type="button" variant="outline" onClick={() => setEditingPatientId(null)}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isSubmitting ? "Saving..." : (editingPatientId ? "Save Changes" : "Add Patient")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      <Dialog open={isLinkDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setPatientToLink(null);
          setProceduresToLink([]);
          setToothNumberToLink('');
          setQuantityToLink(1);
        }
        setIsLinkDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md no-print">
          <DialogHeader><DialogTitle>Link Procedures to {patientToLink?.firstName}</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Select Procedures</Label>
               <Command>
                <CommandInput placeholder="Search procedures..." />
                <CommandList className="max-h-[200px] overflow-y-auto">
                  <CommandEmpty>No procedures found.</CommandEmpty>
                  <CommandGroup>
                  {procedures.map((p) => {
                    const isSelected = proceduresToLink.includes(p.id);
                    return (
                    <CommandItem key={p.id} value={`${p.name.toLowerCase()} ${String(p.cost).toLowerCase()}`} onSelect={() => { if (isSelected) {setProceduresToLink(prev => prev.filter(id => id !== p.id));} else {setProceduresToLink(prev => [...prev, p.id]);}}}>
                         <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}><Check className="h-4 w-4" /></div>
                        <div className="flex-1">{p.name}</div>
                        <div className="text-muted-foreground">₹{p.cost}</div>
                      </CommandItem>
                    )})}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
            <div className="space-y-2"><Label htmlFor="toothNumberToLink">Tooth Number / Notes (Optional)</Label><Input id="toothNumberToLink" value={toothNumberToLink} onChange={(e) => setToothNumberToLink(e.target.value)} placeholder="e.g., 14, 25 or notes" /></div>
            <div className="space-y-2"><Label htmlFor="quantityToLink">Quantity</Label><Input id="quantityToLink" type="number" value={quantityToLink} onChange={(e) => setQuantityToLink(parseInt(e.target.value) || 1)} min="1" /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={handleLinkProcedure} disabled={proceduresToLink.length === 0}>Link Procedure(s)</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
        <CardHeader className="no-print px-1 sm:px-6 pb-2 sm:pb-6">
          <CardTitle className="text-xl sm:text-2xl">Patient List</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage all patient records. Click a patient to see more details.</CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center no-print">
                <TabsList className="h-9 sm:h-10">
                    <TabsTrigger value="primary" className="text-xs sm:text-sm px-3 sm:px-4">Primary Patients</TabsTrigger>
                    <TabsTrigger value="consults" className="text-xs sm:text-sm px-3 sm:px-4">Consult Patients</TabsTrigger>
                </TabsList>
            </div>
            <div className="relative pt-3 sm:pt-4 no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or contact number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm" />
            </div>
            <TabsContent value="primary" className="mt-3 sm:mt-4">{renderContent()}</TabsContent>
            <TabsContent value="consults" className="mt-3 sm:mt-4">{renderContent()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              Apply an overall discount to {discountPatient?.firstName} {discountPatient?.lastName}&apos;s total billable amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(val: 'fixed' | 'percentage') => setDiscountType(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {discountType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              </Label>
              <Input
                type="number"
                value={discountValueState}
                onChange={(e) => setDiscountValueState(e.target.value)}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'fixed' ? 'e.g. 500' : 'e.g. 10'}
              />
            </div>
            {discountPatient && (() => {
              const baseBillable = discountPatient.linkedProcedures?.reduce((acc, proc) => acc + (proc.cost * (proc.quantity || 1)), 0) || 0;
              return (
                <div className="bg-muted p-3 rounded-lg text-xs space-y-1 border">
                  <div className="flex justify-between">
                    <span>Base Billable:</span>
                    <span className="font-semibold">₹{baseBillable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Applied Discount:</span>
                    <span className="font-semibold text-red-600">
                      - ₹{(() => {
                        const val = parseFloat(discountValueState) || 0;
                        if (discountType === 'percentage') {
                          return (baseBillable * val / 100).toLocaleString();
                        }
                        return val.toLocaleString();
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-muted-foreground/20 pt-1 font-semibold text-sm">
                    <span>New Total Billable:</span>
                    <span>
                      ₹{(() => {
                        const val = parseFloat(discountValueState) || 0;
                        const disc = discountType === 'percentage' ? (baseBillable * val / 100) : val;
                        return Math.max(0, baseBillable - disc).toLocaleString();
                      })()}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none no-print">
          <DialogTitle className="sr-only">Photo Preview</DialogTitle>
          <div className="relative w-full h-[80vh] flex items-center justify-center">
            {previewFile && (
              <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain" />
            )}
            <Button
              variant="destructive"
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-64 shadow-xl"
              onClick={handleDeleteExistingFile}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete Photo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
