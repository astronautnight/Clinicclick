

'use client';

import { useState, useEffect, type ChangeEvent, type FormEvent, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { addPatient, deletePatient, updatePatient } from "@/services/patient-service";
import { useUser, useFirestore } from '@/firebase';



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


import { Loader2, Trash2, UserPlus, ServerCrash, Users, Pencil, Link2, X, MapPin, Search, Check, Edit, Save, CalendarIcon, Upload, BriefcaseMedical, Wallet, FileText, Printer } from "lucide-react";
import type { Patient, MarkedTooth, Procedure, ProcedureCategory, LinkedProcedure, Transaction, Prescription } from "@/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { format, subYears, differenceInYears } from "date-fns";
import { cn } from "@/lib/utils";

const initialPatientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'videos' | 'linkedProcedures' | 'markedTeeth' | 'totalPaidOverride' | 'stagedObservations'> & { photos?: File[], videos?: File[] } = {
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
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'videos' | 'markedTeeth' | 'linkedProcedures' | 'stagedObservations'> & { photos?: File[], videos?: File[] }>(initialPatientData);
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
              createdAt: data.createdAt?.toDate(),
              updatedAt: data.updatedAt?.toDate(),
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
    setIsFormOpen(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatientId(patient.id);
    setFormData({
      ...initialPatientData,
      ...patient,
      photos: [],
      videos: [],
    });
    setAge(''); // Reset age field on edit
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
          toast({
            title: "Patient Added",
            description: `${formData.firstName} ${formData.lastName} added successfully.`,
          });
        }
      }

      if (success) {
        setFormData(initialPatientData);
        setAge('');
        setIsFormOpen(false);
        setEditingPatientId(null);
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
        const totalBillable = patient.linkedProcedures?.reduce((acc, proc) => acc + (proc.cost * (proc.quantity || 1)), 0) || 0;
        const totalPaid = patientTransactions.reduce((acc, t) => acc + t.amount, 0);
        const balanceDue = totalBillable - totalPaid;
        return { totalBillable, totalPaid, balanceDue };
    }, [patient, patientTransactions]);
    
    const handlePrint = () => {
        window.print();
    }

    return (
        <div className="px-4 py-4">
            <div className="flex flex-col md:flex-row items-start gap-6 mb-6 no-print">
                <Avatar className="h-20 w-20 ring-2 ring-primary ring-offset-2">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="text-2xl">{patient.firstName?.[0]}{patient.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold">{patient.firstName} {patient.lastName}</h3>
                    <p className="text-muted-foreground">{patient.isConsult ? `Consult Patient @ ${patient.consultLocation || 'N/A'}` : 'Primary Patient'}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-sm">
                        <p><strong>DOB:</strong> {patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd/MM/yyyy') : 'N/A'}</p>
                        <p><strong>Phone:</strong> {patient.contactNumber}</p>
                        <p><strong>WhatsApp:</strong> {patient.whatsappId || 'N/A'}</p>
                        <p><strong>Email:</strong> {patient.email || 'N/A'}</p>
                        <p className="col-span-2"><strong>Address:</strong> {patient.address || 'N/A'}</p>
                        <p><strong>Gender:</strong> {patient.gender}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openEditForm(patient); }}>
                        <Pencil className="mr-1 h-4 w-4" /> Edit Record
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={(e) => {e.stopPropagation(); setPatientToDelete(patient);}}>
                                <Trash2 className="mr-1 h-4 w-4" />
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
                <div className="flex justify-between items-center gap-4 no-print">
                    <div className="flex-1 overflow-x-auto whitespace-nowrap">
                        <TabsList>
                            <TabsTrigger value="dental-chart">Dental Chart</TabsTrigger>
                            <TabsTrigger value="history"><BriefcaseMedical className="mr-1 h-4 w-4" />History</TabsTrigger>
                            <TabsTrigger value="attachments"><Upload className="mr-1 h-4 w-4" />Attachments</TabsTrigger>
                            <TabsTrigger value="billing"><Wallet className="mr-1 h-4 w-4" />Billing</TabsTrigger>
                            <TabsTrigger value="prescriptions"><FileText className="mr-1 h-4 w-4" />Prescriptions</TabsTrigger>
                        </TabsList>
                    </div>
                    <Button variant="outline" onClick={handlePrint} className="no-print"><Printer className="mr-2 h-4 w-4"/>Print</Button>
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
                    <Card><CardContent className="p-6 space-y-4">
                        <div><h4 className="font-semibold">Medical History</h4><p className="text-muted-foreground">{patient.medicalHistory || 'No medical history recorded.'}</p></div>
                        <div><h4 className="font-semibold">Allergies</h4><p className="text-muted-foreground">{patient.allergies || 'No allergies recorded.'}</p></div>
                        <Separator/>
                        <div><h4 className="font-semibold">Dental History</h4><p className="text-muted-foreground">{patient.dentalHistory || 'No dental history recorded.'}</p></div>
                    </CardContent></Card>
                </TabsContent>
                <TabsContent value="attachments" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Attachments</CardTitle>
                      <CardDescription>
                        Manage patient photos, X-rays, and other scans.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Display existing files would go here. For now, it's a placeholder. */}
                      <div>
                        <h4 className="text-md font-semibold mb-2">Uploaded Files</h4>
                        <div className="p-4 border rounded-md text-center text-muted-foreground">
                          {/* This is where we would map over and display patient.photos, patient.videos etc. */}
                          <p>No files uploaded yet.</p>
                          <p className="text-xs mt-1">File display coming soon.</p>
                        </div>
                      </div>

                      {/* Upload section */}
                      <div className="space-y-4 pt-4 border-t">
                        <h4 className="text-md font-semibold">Import New Files</h4>
                        <div className="space-y-2">
                          <Label htmlFor="patientPhotos">Patient Photos</Label>
                          <Input id="patientPhotos" type="file" multiple accept="image/*" className="cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="xrays">X-Rays / Radiographs</Label>
                          <Input id="xrays" type="file" multiple accept="image/*,application/dicom" className="cursor-pointer" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scans">Intraoral Scans</Label>
                          <Input id="scans" type="file" multiple accept=".ply,.obj,.stl" className="cursor-pointer" />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button disabled>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Files (Coming Soon)
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="billing" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle>Billing Summary</CardTitle>
                            <div className="flex justify-around pt-2 text-center">
                                <div><p className="text-2xl font-bold">₹{financials.totalBillable.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Billable</p></div>
                                <div><p className="text-2xl font-bold text-green-600">₹{financials.totalPaid.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Paid</p></div>
                                <div><p className="text-2xl font-bold text-red-600">₹{financials.balanceDue.toLocaleString()}</p><p className="text-sm text-muted-foreground">Balance Due</p></div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="flex justify-end mb-2">
                                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenLinkDialog(patient); }}><Link2 className="mr-1 h-4 w-4" />Link New Procedure</Button>
                            </div>
                            <Table>
                                <TableHeader><TableRow><TableHead>Procedure</TableHead><TableHead>Qty</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {(patient.linkedProcedures || []).map((proc, index) => (
                                        <TableRow key={index}><TableCell>{proc.procedureName} {proc.toothNumber && `(${proc.toothNumber})`}</TableCell><TableCell>{proc.quantity || 1}</TableCell><TableCell className="text-right">₹{(proc.cost * (proc.quantity || 1)).toLocaleString()}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={(e) => {e.stopPropagation(); handleUnlinkProcedure(patient, index);}}><X className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {(!patient.linkedProcedures || patient.linkedProcedures.length === 0) && <p className="text-center text-muted-foreground pt-4">No procedures billed yet.</p>}
                        </CardContent>
                     </Card>
                </TabsContent>
                <TabsContent value="prescriptions" className="mt-4">
                     <Card>
                        <CardHeader><CardTitle>Prescription History</CardTitle></CardHeader>
                        <CardContent>
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
            <AccordionItem value={patient.id} key={patient.id} className="border-b-0">
                <Card className={cn("shadow-sm", patient.isConsult ? "border-accent" : "")}>
                    <AccordionTrigger className="p-4 hover:no-underline w-full no-print">
                      <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-4 text-left">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={undefined} />
                                <AvatarFallback>{patient.firstName?.[0]}{patient.lastName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold">{patient.firstName} {patient.lastName}</div>
                                <div className="text-sm text-muted-foreground hidden md:block">{patient.contactNumber}</div>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              {patient.isConsult && <Badge variant="outline" className="border-accent text-accent">Consult</Badge>}
                          </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 no-print">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-special1" />
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
            <Button onClick={openAddForm} disabled={!user || !clinicId}>
              <UserPlus className="mr-2 h-4 w-4" /> Add New Patient
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
                  </div>
                </fieldset>

                <fieldset className="border-t pt-4">
                  <legend className="text-lg font-medium mb-4">Patient Files</legend>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="photos">Patient Photos (Optional)</Label><Input id="photos" name="photos" type="file" multiple onChange={handleFileChange} disabled={isSubmitting} accept="image/*" /></div>
                    <div className="space-y-2"><Label htmlFor="videos">Patient Videos (Optional)</Label><Input id="videos" name="videos" type="file" multiple onChange={handleFileChange} disabled={isSubmitting} accept="video/*" /></div>
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

      <Card>
        <CardHeader className="no-print">
          <CardTitle>Patient List</CardTitle>
          <CardDescription>Manage all patient records. Click a patient to see more details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex justify-center no-print">
                <TabsList>
                    <TabsTrigger value="primary">Primary Patients</TabsTrigger>
                    <TabsTrigger value="consults">Consult Patients</TabsTrigger>
                </TabsList>
            </div>
            <div className="relative pt-4 no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or contact number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <TabsContent value="primary" className="mt-4">{renderContent()}</TabsContent>
            <TabsContent value="consults" className="mt-4">{renderContent()}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
