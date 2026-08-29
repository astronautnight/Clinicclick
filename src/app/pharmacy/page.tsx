
'use client';

import { useState, type FormEvent, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Drug, DosageForm, Prescription, PrescriptionItem, Patient, UserProfile, Doctor, MedicalEmergency } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Pill, FileText, PlusCircle, Trash2, FilePenLine, Copy, Loader2, ServerCrash, AlertTriangle, Search, Printer, LifeBuoy } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { PrescriptionPreview } from '@/components/prescription-preview';
import { useFirestore, useUser } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { addDrug, updateDrug, deleteDrug, seedMissingDrugs } from '@/services/drug-service';
import { addMedicalEmergency, updateMedicalEmergency, deleteMedicalEmergency, seedInitialEmergencies } from '@/services/medical-emergency-service';
import { getUserProfile } from '@/services/auth-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const initialDrugData: Omit<Drug, 'id' | 'createdAt' | 'updatedAt'> = {
  genericName: "", brandName: "", dosageForm: "Tablet", strength: "", category: "Other", notes: "",
};

const initialEmergencyData: Omit<MedicalEmergency, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  management: [],
  drugs: [],
};


export default function PharmacyPage() {
  const { user, clinicId, loading, clinicLoading } = useUser();
  const noClinic = user && !clinicId && !loading && !clinicLoading;

  const db = useFirestore();
  const { toast } = useToast();
  
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [emergencies, setEmergencies] = useState<MedicalEmergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEmergencies, setIsLoadingEmergencies] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [newDrug, setNewDrug] = useState(initialDrugData);
  const [isAddDrugFormOpen, setIsAddDrugFormOpen] = useState(false);

  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [isEditDrugFormOpen, setIsEditDrugFormOpen] = useState(false);
  const [editedDrugData, setEditedDrugData] = useState<Omit<Drug, 'id' | 'createdAt' | 'updatedAt'>>(initialDrugData);

  const [currentPrescription, setCurrentPrescription] = useState<Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>>({
    patientId: '', doctorId: '', date: new Date().toISOString().split('T')[0], items: [], notes: ''
  });
  const [isPrescriptionFormOpen, setIsPrescriptionFormOpen] = useState(false);
  const [prescriptionToPreview, setPrescriptionToPreview] = useState<Prescription | null>(null);
  
  const [clinicProfile, setClinicProfile] = useState<UserProfile | null>(null);
  
  const prescriptionPreviewRef = useRef<HTMLDivElement>(null);

  const [isAddEmergencyOpen, setIsAddEmergencyOpen] = useState(false);
  const [newEmergency, setNewEmergency] = useState(initialEmergencyData);
  const [editingEmergency, setEditingEmergency] = useState<MedicalEmergency | null>(null);
  const [emergencyToDelete, setEmergencyToDelete] = useState<MedicalEmergency | null>(null);

  const [drugToDelete, setDrugToDelete] = useState<Drug | null>(null);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState<Prescription | null>(null);


   useEffect(() => {
    async function loadProfileAndSeed() {
        if (!db || !user || !clinicId) return;

        const profileSnap = await getDoc(doc(db, "clinics", clinicId));
        if (profileSnap.exists()) {
            const clinicData = profileSnap.data();
            // Assuming clinic profile info is stored directly on the clinic doc
             setClinicProfile({
                id: profileSnap.id,
                clinicName: clinicData.name,
                ...clinicData // spread other potential fields
            } as UserProfile);

            if (!clinicData.seeded_v1_drugs) {
                console.log("Drug inventory not seeded for this clinic. Seeding now...");
                await seedMissingDrugs(clinicId);
                toast({
                    title: "Drug Inventory Updated",
                    description: "Your clinic's drug database has been updated with the latest presets.",
                });
            }
             if (!clinicData.seeded_v1_emergencies) {
                await seedInitialEmergencies(clinicId);
             }
        }
    }
    loadProfileAndSeed();
}, [db, user, clinicId, toast]);

  useEffect(() => {
    if (!user || !db || !clinicId) {
      setIsLoading(false);
      return;
    }

    // drugs (clinic-scoped)
    const drugsColRef = collection(db, "clinics", clinicId, "drugs");
    const drugsUnsub = onSnapshot(
      drugsColRef,
      (snapshot) => {
        const fetchedDrugs: Drug[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Drug));
        setDrugs(fetchedDrugs.sort((a, b) => a.genericName.localeCompare(b.genericName)));
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: drugsColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError("Failed to fetch drugs. Check permissions.");
        setIsLoading(false);
      }
    );

    // patients (clinic-scoped)
    const patientsColRef = collection(db, "clinics", clinicId, "patients");
    const patientsUnsub = onSnapshot(
      patientsColRef,
      (snapshot) => {
        const fetchedPatients: Patient[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Patient));
        setPatients(fetchedPatients.sort((a, b) => a.firstName.localeCompare(b.firstName)));
      },
      (err) => console.warn("Could not fetch patients for prescriptions:", err)
    );

    // doctors (clinic-scoped)
    const doctorsColRef = collection(db, "clinics", clinicId, "doctors");
    const doctorsUnsub = onSnapshot(
      doctorsColRef,
      (snapshot) => {
        const fetchedDoctors: Doctor[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Doctor));
        setDoctors(fetchedDoctors.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (err) => console.warn("Could not fetch doctors for prescriptions:", err)
    );

    // prescriptions (clinic-scoped)
    const prescriptionsColRef = collection(db, "clinics", clinicId, "prescriptions");
    const prescriptionsUnsub = onSnapshot(
      prescriptionsColRef,
      (snapshot) => {
        const fetchedPrescriptions: Prescription[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Prescription));
        setPrescriptions(fetchedPrescriptions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      },
      (err) => {
         const permissionError = new FirestorePermissionError({
          path: prescriptionsColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );
    
    // emergencies (clinic-scoped)
    const emergenciesColRef = collection(db, 'clinics', clinicId, 'medicalEmergencies');
    const emergenciesUnsub = onSnapshot(emergenciesColRef, (snapshot) => {
      setIsLoadingEmergencies(true);
      const fetchedEmergencies: MedicalEmergency[] = snapshot.docs.map(d => ({id: d.id, ...d.data() as any}));
      setEmergencies(fetchedEmergencies.sort((a,b) => a.name.localeCompare(b.name)));
      setIsLoadingEmergencies(false);
    }, err => {
        console.error("Error fetching emergencies:", err);
        setIsLoadingEmergencies(false);
    });

    return () => {
      drugsUnsub();
      patientsUnsub();
      doctorsUnsub();
      prescriptionsUnsub();
      emergenciesUnsub();
    };
  }, [user, db, clinicId]);

  const handleDrugInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewDrug(prev => ({ ...prev, [name]: value }));
  };

  const handleDrugSelectChange = (name: string, value: string) => {
    setNewDrug(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDrug = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !clinicId) {
      toast({ title: "Not Authenticated", description: "You must be logged in to a clinic to add a drug.", variant: "destructive" });
      return;
    }
    if (!newDrug.genericName) {
      toast({ title: "Error", description: "Generic name is required for a drug.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addDrug(clinicId, newDrug);
      toast({ title: "Drug Added", description: `${newDrug.genericName} has been added to inventory.` });
      setNewDrug(initialDrugData);
      setIsAddDrugFormOpen(false);
    } catch (error) {
      console.error("Error adding drug:", error);
      toast({ title: "Error", description: "Could not add drug.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDrug = async () => {
    if (drugToDelete && user && clinicId) {
      setIsSubmitting(true);
      try {
        await deleteDrug(clinicId, drugToDelete.id);
        toast({ title: "Drug Deleted", description: `${drugToDelete.genericName} has been removed from inventory.` });
        setDrugToDelete(null);
      } catch (error) {
        console.error("Error deleting drug:", error);
        toast({ title: "Error", description: "Could not delete drug.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleOpenEditDrugForm = (drug: Drug) => {
    setEditingDrug(drug);
    setEditedDrugData({
      genericName: drug.genericName,
      brandName: drug.brandName,
      dosageForm: drug.dosageForm,
      strength: drug.strength,
      category: drug.category,
      notes: drug.notes,
    });
    setIsEditDrugFormOpen(true);
  };

  const handleEditDrugInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedDrugData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditDrugSelectChange = (name: string, value: string) => {
    setEditedDrugData(prev => ({ ...prev, [name]: value as any }));
  };

  const handleUpdateDrug = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDrug || !user || !clinicId) {
      toast({ title: "Error", description: "No drug selected for editing.", variant: "destructive" });
      return;
    }
    if (!editedDrugData.genericName) {
      toast({ title: "Error", description: "Generic name is required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await updateDrug(clinicId, editingDrug.id, editedDrugData);
      toast({ title: "Drug Updated", description: `${editedDrugData.genericName} has been updated.` });
      setIsEditDrugFormOpen(false);
      setEditingDrug(null);
    } catch (error) {
      console.error("Error updating drug:", error);
      toast({ title: "Error", description: "Could not update drug.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrescriptionChange = (field: keyof typeof currentPrescription, value: any) => {
    setCurrentPrescription(prev => ({ ...prev, [field]: value }));
  };

  const handlePrescriptionItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updatedItems = [...currentPrescription.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    if (field === 'drugId') {
      const selectedDrug = drugs.find(d => d.id === value);
      updatedItems[index].drugName = selectedDrug ? `${selectedDrug.genericName} (${selectedDrug.brandName || 'Generic'}) - ${selectedDrug.strength}` : '';
    }
    handlePrescriptionChange('items', updatedItems);
  };

  const addPrescriptionItem = () => {
    handlePrescriptionChange('items', [...currentPrescription.items, { drugId: '', drugName: '', dosage: '', frequency: '', duration: '', notes: '' }]);
  };

  const removePrescriptionItem = (index: number) => {
    const updatedItems = currentPrescription.items.filter((_, i) => i !== index);
    handlePrescriptionChange('items', updatedItems);
  };

  const handleSavePrescription = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db || !clinicId) {
      toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
      return;
    }
    if (!currentPrescription.patientId || !currentPrescription.doctorId || currentPrescription.items.length === 0 || currentPrescription.items.some(item => !item.drugId || !item.dosage || !item.frequency || !item.duration)) {
      toast({ title: "Error", description: "Patient, Doctor, and complete details (Drug, Dosage, Frequency, Duration) for all medication items are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Omit<Prescription, 'id'> = {
        ...currentPrescription,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      } as any;

      const prescriptionsColRef = collection(db, 'clinics', clinicId, 'prescriptions');
      const docRef = await addDoc(prescriptionsColRef, payload);
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
          setPrescriptionToPreview({ id: savedDoc.id, ...savedDoc.data() } as Prescription);
      }
      
      setCurrentPrescription({ patientId: '', doctorId: '', date: new Date().toISOString().split('T')[0], items: [], notes: '' });
      setIsPrescriptionFormOpen(false);
      toast({ title: "Prescription Saved", description: `Prescription saved successfully.` });
    } catch (err) {
      console.error("Error saving prescription:", err);
      toast({ title: "Error", description: "Could not save prescription.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrescription = async () => {
    if (!prescriptionToDelete || !user || !db || !clinicId) return;
    try {
      const prescDocRef = doc(db, 'clinics', clinicId, 'prescriptions', prescriptionToDelete.id);
      await deleteDoc(prescDocRef);
      toast({ title: "Prescription Deleted", description: `Prescription deleted.` });
      setPrescriptionToDelete(null);
    } catch (err) {
      console.error("Error deleting prescription:", err);
      toast({ title: "Error", description: "Could not delete prescription.", variant: "destructive" });
    }
  };
  
  const handlePrint = () => {
    const printContent = prescriptionPreviewRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      // Reload is required to re-hydrate React app post-print
      window.location.reload(); 
    }
  };

  const handleCopy = () => {
    if (!prescriptionToPreview || !clinicProfile || !patients || !doctors) return;
    
    const patient = patients.find(p => p.id === prescriptionToPreview.patientId);
    const doctor = doctors.find(d => d.id === prescriptionToPreview.doctorId);
    
    let text = `${clinicProfile?.clinicName || 'Dental Clinic'}\n`;
    const doctorName = doctor?.name || '';
    const formattedDocName = doctorName.startsWith('Dr. ') ? doctorName : `Dr. ${doctorName}`;
    text += `${formattedDocName}\n`;
    if (doctor?.specialization) text += `${doctor.specialization}\n`;
    text += `\n`;
    text += `Patient: ${patient?.firstName} ${patient?.lastName}\n`;
    text += `Date: ${format(new Date(prescriptionToPreview.date), 'dd/MM/yyyy')}\n`;
    text += `-------------------------------------------\n\nRx\n\n`;

    prescriptionToPreview.items.forEach((item, i) => {
      text += `${i + 1}. ${item.drugName}\n`;
      text += `   Dosage: ${item.dosage}\n`;
      text += `   Frequency: ${item.frequency}\n`;
      text += `   Duration: ${item.duration}\n`;
      if (item.notes) text += `   Instruction: ${item.notes}\n`;
      text += `\n`;
    });

    if (prescriptionToPreview.notes) {
      text += `Advice:\n${prescriptionToPreview.notes}\n`;
    }
    text += `\nSignature:\n\nDr. ${doctor?.name || 'Doctor'}\n`;
    
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "The prescription text has been copied.",
    });
  };
  
  const handleEmergencySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !clinicId) return;
    setIsSubmitting(true);
    const data: Omit<MedicalEmergency, 'id'|'createdAt'|'updatedAt'> = {
      name: newEmergency.name,
      description: newEmergency.description,
      management: newEmergency.management.filter(m => m.trim() !== ''),
      drugs: newEmergency.drugs.filter(d => d.trim() !== ''),
    };

    try {
        if(editingEmergency) {
            await updateMedicalEmergency(clinicId, editingEmergency.id, data);
            toast({ title: 'Emergency Protocol Updated' });
        } else {
            await addMedicalEmergency(clinicId, data);
            toast({ title: 'Emergency Protocol Added' });
        }
        setIsAddEmergencyOpen(false);
        setNewEmergency(initialEmergencyData);
        setEditingEmergency(null);
    } catch(error) {
        console.error("Error saving emergency protocol", error);
        toast({ title: 'Error', description: 'Could not save protocol.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const openAddEmergencyForm = (emergency: MedicalEmergency | null) => {
      if(emergency) {
          setEditingEmergency(emergency);
          setNewEmergency({
              name: emergency.name,
              description: emergency.description,
              management: emergency.management,
              drugs: emergency.drugs,
          });
      } else {
          setEditingEmergency(null);
          setNewEmergency(initialEmergencyData);
      }
      setIsAddEmergencyOpen(true);
  }

  const handleDeleteEmergency = async () => {
    if(!emergencyToDelete || !user || !clinicId) return;
    try {
        await deleteMedicalEmergency(clinicId, emergencyToDelete.id);
        toast({ title: 'Emergency Protocol Deleted', variant: 'destructive' });
        setEmergencyToDelete(null);
    } catch (error) {
        console.error('Error deleting emergency protocol', error);
        toast({ title: 'Error', description: 'Could not delete protocol.', variant: 'destructive'});
    }
  }


  const renderDrugInventory = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading drug inventory...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive">
          <ServerCrash className="h-5 w-5" />
          <AlertTitle>Database Error</AlertTitle>
          <ShadAlertDescription>{error}</ShadAlertDescription>
        </Alert>
      );
    }

    const filteredDrugs = drugs.filter(drug => {
        const query = searchQuery.toLowerCase();
        return (
            drug.genericName.toLowerCase().includes(query) ||
            (drug.brandName && drug.brandName.toLowerCase().includes(query)) ||
            (drug.category && drug.category.toLowerCase().includes(query))
        );
    });

    if (filteredDrugs.length === 0) {
      return (
        <>
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by generic name, brand name, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>
            <p className="text-muted-foreground p-4 text-center">
                {drugs.length === 0 ? "No drugs in inventory. Click 'Add New Drug' to get started." : "No drugs match your search."}
            </p>
        </>
      )
    }

    return (
      <>
        <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search by generic name, brand name, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
            />
        </div>
        <Table>
            <TableHeader><TableRow><TableHead>Generic Name</TableHead><TableHead>Brand Name</TableHead><TableHead>Form</TableHead><TableHead>Strength</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
            {filteredDrugs.map(drug => (
                <TableRow key={drug.id}>
                <TableCell className="font-medium">{drug.genericName}</TableCell><TableCell>{drug.brandName || 'N/A'}</TableCell>
                <TableCell>{drug.dosageForm}</TableCell><TableCell>{drug.strength || 'N/A'}</TableCell><TableCell>{drug.category || 'N/A'}</TableCell>
                <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditDrugForm(drug)} aria-label="Edit drug" disabled={isSubmitting}>
                    <FilePenLine className="h-4 w-4 text-blue-600" />
                    </Button>
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setDrugToDelete(drug)} aria-label="Delete drug" disabled={isSubmitting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeaderCustom>
                        <AlertDialogTitleCustom>Are you sure?</AlertDialogTitleCustom>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the drug "{drugToDelete?.genericName} ({drugToDelete?.brandName})".
                        </AlertDialogDescription>
                        </AlertDialogHeaderCustom>
                        <AlertDialogFooterCustom>
                        <AlertDialogCancel onClick={() => setDrugToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDrug}>Delete</AlertDialogAction>
                        </AlertDialogFooterCustom>
                    </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </>
    )
  };
  
  const renderSavedPrescriptions = () => {
    return (
        <Card className="shadow-lg">
          <CardHeader><CardTitle className="flex items-center text-xl"><FileText className="mr-2 h-5 w-5 text-accent" />Saved Prescriptions</CardTitle><CardDescription>List of all generated prescriptions.</CardDescription></CardHeader>
          <CardContent>
            {prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 min-h-[150px] border rounded-lg bg-muted/30">
                <p className="text-lg font-medium text-muted-foreground mb-2">No prescriptions created yet.</p>
                <p className="text-sm text-muted-foreground mb-4">Click "Create Prescription" to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prescriptions.map(presc => (
                  <Card key={presc.id} className="bg-muted/20 shadow-sm">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">Prescription for {patients.find(p => p.id === presc.patientId)?.firstName || 'N/A'} {patients.find(p => p.id === presc.patientId)?.lastName || ''}</CardTitle>
                          <CardDescription>Date: {format(new Date(presc.date), 'dd/MM/yyyy')} | Doctor: {doctors.find(d => d.id === presc.doctorId)?.name || presc.doctorId}</CardDescription>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setPrescriptionToDelete(presc)} aria-label="Delete prescription">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeaderCustom>
                              <AlertDialogTitleCustom>Are you sure?</AlertDialogTitleCustom>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the prescription for {patients.find(p => p.id === prescriptionToDelete?.patientId)?.firstName || 'N/A'} dated {prescriptionToDelete ? format(new Date(prescriptionToDelete.date), 'dd/MM/yyyy') : ''}.
                              </AlertDialogDescription>
                            </AlertDialogHeaderCustom>
                            <AlertDialogFooterCustom>
                              <AlertDialogCancel onClick={() => setPrescriptionToDelete(null)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeletePrescription}>Delete</AlertDialogAction>
                            </AlertDialogFooterCustom>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-semibold text-sm mb-1">Medications:</h4>
                      <ul className="list-disc list-inside pl-4 space-y-1">
                        {presc.items.map((item, idx) => (
                          <li key={idx} className="text-sm">
                            <strong>{item.drugName || drugs.find(d => d.id === item.drugId)?.genericName || item.drugId}:</strong> {item.dosage}, {item.frequency} for {item.duration}. {item.notes && <span className="text-muted-foreground italic">({item.notes})</span>}
                          </li>
                        ))}
                      </ul>
                      {presc.notes && <p className="text-sm mt-2 pt-2 border-t"><strong>Overall Notes:</strong> {presc.notes}</p>}
                    </CardContent>
                    <CardFooter className="border-t pt-4 flex justify-end">
                      <Button variant="secondary" size="sm" onClick={() => setPrescriptionToPreview(presc)}>
                        View
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    );
  };
  
  const renderEmergencies = () => {
    return (
        <Card className="shadow-lg">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center text-xl text-destructive"><AlertTriangle className="mr-2 h-5 w-5" />Medical Emergencies</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => openAddEmergencyForm(null)}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Protocol
                    </Button>
                </div>
                <CardDescription>Quick reference for managing emergencies on the dental chair.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isLoadingEmergencies ? (
                    <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : emergencies.length === 0 ? (
                    <p className="text-muted-foreground text-center p-4">No emergency protocols defined.</p>
                ) : (
                    emergencies.map(emergency => (
                        <Card key={emergency.id} className="border-destructive/30 bg-destructive/5">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg text-destructive">{emergency.name}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddEmergencyForm(emergency)}><FilePenLine className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEmergencyToDelete(emergency)}><Trash2 className="h-4 w-4 text-destructive/70" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeaderCustom>
                                                    <AlertDialogTitleCustom>Are you sure?</AlertDialogTitleCustom>
                                                    <AlertDialogDescription>This will delete the "{emergency.name}" protocol. This cannot be undone.</AlertDialogDescription>
                                                </AlertDialogHeaderCustom>
                                                <AlertDialogFooterCustom>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteEmergency}>Delete</AlertDialogAction>
                                                </AlertDialogFooterCustom>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <CardDescription className="pt-1">{emergency.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <h4 className="font-semibold mb-2">Management Steps:</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                    {emergency.management.map((step, i) => <li key={i}>{step}</li>)}
                                </ul>
                                <h4 className="font-semibold mt-4 mb-2">Primary Drugs:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {emergency.drugs.map((drug, i) => <Badge key={i} variant="destructive">{drug}</Badge>)}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Pill className="mr-3 h-8 w-8 text-special5" />
            Pharmacy & Prescriptions
        </h1>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isAddDrugFormOpen} onOpenChange={setIsAddDrugFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setNewDrug(initialDrugData); setIsAddDrugFormOpen(true); }} disabled={!user || isSubmitting || !clinicId}>
                <Pill className="mr-2 h-4 w-4" /> Add New Drug
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader><DialogTitle className="text-xl">Add New Drug to Inventory</DialogTitle></DialogHeader>
              <form onSubmit={handleAddDrug}>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label htmlFor="genericName">Generic Name</Label><Input id="genericName" name="genericName" value={newDrug.genericName} onChange={handleDrugInputChange} placeholder="e.g., Amoxicillin" required disabled={isSubmitting} /></div>
                    <div><Label htmlFor="brandName">Brand Name (Optional)</Label><Input id="brandName" name="brandName" value={newDrug.brandName || ''} onChange={handleDrugInputChange} placeholder="e.g., Mox, Amoxil" disabled={isSubmitting} /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dosageForm">Dosage Form</Label>
                      <Select name="dosageForm" value={newDrug.dosageForm} onValueChange={(val: DosageForm) => handleDrugSelectChange('dosageForm', val)} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{(['Tablet', 'Capsule', 'Syrup', 'Mouthwash', 'Toothpaste', 'Gel', 'Ointment', 'Injection', 'Other'] as DosageForm[]).map(df => <SelectItem key={df} value={df}>{df}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label htmlFor="strength">Strength</Label><Input id="strength" name="strength" value={newDrug.strength} onChange={handleDrugInputChange} placeholder="e.g., 500mg, 0.2%" disabled={isSubmitting} /></div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select name="category" value={newDrug.category || 'Other'} onValueChange={(val) => handleDrugSelectChange('category', val)} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>{(['Analgesic', 'Antibiotic', 'Antiseptic', 'Anti-inflammatory', 'Fluoride', 'NSAID', 'Local Anesthetic', 'Antihistamine', 'Steroid', 'Antifungal', 'Antiviral', 'Anxiolytic', 'Sedative', 'Emergency', 'Other']).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" name="notes" value={newDrug.notes || ''} onChange={handleDrugInputChange} placeholder="e.g., Indications, precautions" disabled={isSubmitting} /></div>
                </div>
                <DialogFooter className="border-t pt-4">
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Add Drug'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPrescriptionFormOpen} onOpenChange={setIsPrescriptionFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setCurrentPrescription({ patientId: '', doctorId: doctors.length ? doctors[0]?.id || '' : '', date: new Date().toISOString().split('T')[0], items: [], notes: '' }); addPrescriptionItem(); setIsPrescriptionFormOpen(true); }} disabled={!user || !clinicId}>
                <FileText className="mr-2 h-4 w-4" /> Create Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader><DialogTitle className="text-xl">Create New Prescription</DialogTitle></DialogHeader>
              <form onSubmit={handleSavePrescription}>
                <div className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="patientId">Patient *</Label>
                      <Select value={currentPrescription.patientId} onValueChange={(val) => handlePrescriptionChange('patientId', val)} required>
                        <SelectTrigger id="patientId"><SelectValue placeholder="Select Patient" /></SelectTrigger>
                        <SelectContent>
                          {patients.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No patients found</div> : patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.contactNumber || 'N/A'})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="doctorId">Doctor *</Label>
                      <Select value={currentPrescription.doctorId} onValueChange={(val) => handlePrescriptionChange('doctorId', val)} required>
                        <SelectTrigger id="doctorId"><SelectValue placeholder="Select Doctor" /></SelectTrigger>
                        <SelectContent>
                          {doctors.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No doctors found</div> : doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name} {d.specialization ? `(${d.specialization})` : ''}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div><Label htmlFor="date">Date *</Label><Input id="date" type="date" value={currentPrescription.date} onChange={(e) => handlePrescriptionChange('date', e.target.value)} required /></div>
                  </div>

                  <CardTitle className="text-lg pt-4 border-t mt-2">Medications</CardTitle>
                  {currentPrescription.items.map((item, index) => (
                    <Card key={index} className="p-4 space-y-3 bg-muted/40 border shadow-sm">
                      <div className="flex justify-between items-center">
                        <Label className="text-md font-semibold">Medication Item {index + 1}</Label>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removePrescriptionItem(index)} aria-label="Remove medication item"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`drugId-${index}`}>Drug *</Label>
                          <Select value={item.drugId} onValueChange={(val) => handlePrescriptionItemChange(index, 'drugId', val)} required>
                            <SelectTrigger id={`drugId-${index}`}><SelectValue placeholder="Select Drug" /></SelectTrigger>
                            <SelectContent>
                              {drugs.length === 0 ? <div className="p-2 text-sm text-muted-foreground">No drugs found</div> : drugs.map(d => <SelectItem key={d.id} value={d.id}>{d.genericName} ({d.brandName || 'Generic'}) - {d.strength}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div><Label htmlFor={`dosage-${index}`}>Dosage * (e.g., 1 tablet, 5ml)</Label><Input id={`dosage-${index}`} value={item.dosage} onChange={(e) => handlePrescriptionItemChange(index, 'dosage', e.target.value)} required placeholder="e.g., 1 Tab" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><Label htmlFor={`frequency-${index}`}>Frequency * (e.g., Twice a day)</Label><Input id={`frequency-${index}`} value={item.frequency} onChange={(e) => handlePrescriptionItemChange(index, 'frequency', e.target.value)} required placeholder="e.g., BD / TDS" /></div>
                        <div><Label htmlFor={`duration-${index}`}>Duration * (e.g., 5 days)</Label><Input id={`duration-${index}`} value={item.duration} onChange={(e) => handlePrescriptionItemChange(index, 'duration', e.target.value)} required placeholder="e.g., 5 Days" /></div>
                      </div>
                      <div><Label htmlFor={`itemNotes-${index}`}>Instructions (Optional)</Label><Textarea id={`itemNotes-${index}`} value={item.notes || ''} onChange={(e) => handlePrescriptionItemChange(index, 'notes', e.target.value)} placeholder="e.g., After food, SOS for pain" /></div>
                    </Card>
                  ))}
                  <Button type="button" variant="outline" onClick={addPrescriptionItem}><PlusCircle className="mr-2 h-4 w-4" />Add Medication Item</Button>
                  <div className="pt-4 border-t">
                    <Label htmlFor="prescriptionNotes">Overall Prescription Notes (Optional)</Label>
                    <Textarea id="prescriptionNotes" value={currentPrescription.notes || ''} onChange={(e) => handlePrescriptionChange('notes', e.target.value)} placeholder="e.g., Review after 3 days, Avoid spicy food" />
                  </div>
                </div>
                <DialogFooter className="border-t pt-4">
                  <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>Generate Prescription</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!prescriptionToPreview} onOpenChange={(isOpen) => { if (!isOpen) setPrescriptionToPreview(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generated Prescription</DialogTitle>
            <DialogDescription>Review the generated prescription. You can copy or print it.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto" ref={prescriptionPreviewRef}>
            {prescriptionToPreview && clinicProfile && (
              <PrescriptionPreview
                prescription={prescriptionToPreview}
                patient={patients.find(p => p.id === prescriptionToPreview.patientId) || null}
                clinic={clinicProfile}
                doctor={doctors.find(d => d.id === prescriptionToPreview.doctorId) || null}
              />
            )}
          </div>
          <DialogFooter className="border-t pt-4 flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isAddEmergencyOpen} onOpenChange={setIsAddEmergencyOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <DialogTitle>{editingEmergency ? 'Edit' : 'Add'} Medical Emergency Protocol</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEmergencySubmit} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                <div className="space-y-1">
                    <Label htmlFor="emergencyName">Emergency Name</Label>
                    <Input id="emergencyName" value={newEmergency.name} onChange={(e) => setNewEmergency({...newEmergency, name: e.target.value})} required/>
                </div>
                 <div className="space-y-1">
                    <Label htmlFor="emergencyDescription">Description</Label>
                    <Textarea id="emergencyDescription" value={newEmergency.description} onChange={(e) => setNewEmergency({...newEmergency, description: e.target.value})} />
                </div>
                 <div className="space-y-2">
                    <Label>Management Steps</Label>
                    {newEmergency.management.map((step, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <Input value={step} onChange={e => {
                                const steps = [...newEmergency.management];
                                steps[i] = e.target.value;
                                setNewEmergency({...newEmergency, management: steps});
                            }} placeholder={`Step ${i+1}`} />
                            <Button type="button" size="icon" variant="ghost" onClick={() => setNewEmergency({...newEmergency, management: newEmergency.management.filter((_, idx) => idx !== i)})}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewEmergency({...newEmergency, management: [...newEmergency.management, '']})}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Step
                    </Button>
                </div>
                 <div className="space-y-2">
                    <Label>Associated Drugs</Label>
                    {newEmergency.drugs.map((drug, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <Input value={drug} onChange={e => {
                                const drugs = [...newEmergency.drugs];
                                drugs[i] = e.target.value;
                                setNewEmergency({...newEmergency, drugs: drugs});
                            }} placeholder={`Drug ${i+1}`}/>
                             <Button type="button" size="icon" variant="ghost" onClick={() => setNewEmergency({...newEmergency, drugs: newEmergency.drugs.filter((_, idx) => idx !== i)})}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewEmergency({...newEmergency, drugs: [...newEmergency.drugs, '']})}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add Drug
                    </Button>
                </div>

                 <DialogFooter className="border-t pt-4 !mt-6">
                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Protocol'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDrugFormOpen} onOpenChange={(isOpen) => { setIsEditDrugFormOpen(isOpen); if (!isOpen) setEditingDrug(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Drug: {editingDrug?.genericName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDrug}>
            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="editGenericName">Generic Name</Label><Input id="editGenericName" name="genericName" value={editedDrugData.genericName} onChange={handleEditDrugInputChange} required disabled={isSubmitting} /></div>
                <div><Label htmlFor="editBrandName">Brand Name</Label><Input id="editBrandName" name="brandName" value={editedDrugData.brandName || ''} onChange={handleEditDrugInputChange} disabled={isSubmitting} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="editDosageForm">Dosage Form</Label>
                  <Select name="dosageForm" value={editedDrugData.dosageForm} onValueChange={(val: DosageForm) => handleEditDrugSelectChange('dosageForm', val)} disabled={isSubmitting}>
                    <SelectTrigger id="editDosageForm"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['Tablet', 'Capsule', 'Syrup', 'Mouthwash', 'Toothpaste', 'Gel', 'Ointment', 'Injection', 'Other'] as DosageForm[]).map(df => <SelectItem key={df} value={df}>{df}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label htmlFor="editStrength">Strength</Label><Input id="editStrength" name="strength" value={editedDrugData.strength || ''} onChange={handleEditDrugInputChange} disabled={isSubmitting} /></div>
                <div>
                  <Label htmlFor="editCategory">Category</Label>
                   <Select name="category" value={editedDrugData.category || 'Other'} onValueChange={(val) => handleEditDrugSelectChange('category', val)} disabled={isSubmitting}>
                    <SelectTrigger id="editCategory"><SelectValue /></SelectTrigger>
                    <SelectContent>{(['Analgesic', 'Antibiotic', 'Antiseptic', 'Anti-inflammatory', 'Fluoride', 'NSAID', 'Local Anesthetic', 'Antihistamine', 'Steroid', 'Antifungal', 'Antiviral', 'Anxiolytic', 'Sedative', 'Emergency', 'Other']).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label htmlFor="editNotes">Notes</Label><Textarea id="editNotes" name="notes" value={editedDrugData.notes || ''} onChange={handleEditDrugInputChange} disabled={isSubmitting} /></div>
            </div>
            <DialogFooter className="border-t pt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      <Tabs defaultValue="inventory" className="w-full">
        <div className="flex justify-center">
            <TabsList>
              <TabsTrigger value="inventory">Drug Inventory</TabsTrigger>
              <TabsTrigger value="prescriptions">Saved Prescriptions</TabsTrigger>
              <TabsTrigger value="emergencies">Emergencies</TabsTrigger>
            </TabsList>
        </div>
        <TabsContent value="inventory" className="mt-6">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center text-xl"><Pill className="mr-2 h-5 w-5 text-primary" />Drug Inventory</CardTitle>
                    <CardDescription>List of available drugs in the clinic.</CardDescription>
                </CardHeader>
                <CardContent>
                    {renderDrugInventory()}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="prescriptions" className="mt-6">
            {renderSavedPrescriptions()}
        </TabsContent>
        <TabsContent value="emergencies" className="mt-6">
            {renderEmergencies()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
