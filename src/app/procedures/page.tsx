

'use client';

import { useState, type FormEvent, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Procedure, ProcedureCategory, Patient, LinkedProcedure, Transaction, Appointment, ProcedureSubStep } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ListPlus, Link2, ClipboardList, Trash2, FilePenLine, Loader2, ServerCrash, Video, PlusCircle, X, Search, CalendarCheck, CheckCircle2, Circle, History, Wallet, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar, Clock, Check, Stethoscope, User, Phone, StickyNote, FileText, MoreVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFirestore, useUser } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { addProcedure, deleteProcedure, updateProcedure as updateProcedureService, seedInitialProcedures } from '@/services/procedure-service';
import { updatePatient } from '@/services/patient-service';
import { getUserProfile } from '@/services/auth-service';
import { MASTER_PROCEDURE_PRESET, getPresetSubProcedures, reconcileSubProcedures } from '@/lib/procedure-presets';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, isToday, isSameDay, subDays, addDays, startOfDay } from 'date-fns';
import { PatientBillingSummary } from '@/components/appointments/patient-billing-summary';
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const initialProcedureFormData: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt' | 'isTemplate'> = {
  name: "",
  description: "",
  category: "Other",
  cost: 0,
  durationMinutes: 30,
  videoUrl: "",
  materials: [],
};

const renderMaterialsFields = (
  materials: string[],
  setMaterials: React.Dispatch<React.SetStateAction<string[]>>,
  isSubmitting: boolean
) => {
  const handleMaterialChange = (index: number, value: string) => {
    const newMaterials = [...materials];
    newMaterials[index] = value;
    setMaterials(newMaterials);
  };

  const addMaterial = () => {
    setMaterials([...materials, '']);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      <Label className="text-xs sm:text-sm font-medium">Required Materials / Armamentarium</Label>
      {materials.map((material, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={material}
            onChange={(e) => handleMaterialChange(index, e.target.value)}
            placeholder={`Material ${index + 1}`}
            disabled={isSubmitting}
            className="h-8 sm:h-9 text-xs sm:text-sm"
          />
          <Button type="button" variant="destructive" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMaterial(index)} disabled={isSubmitting}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addMaterial} disabled={isSubmitting} className="h-8 text-xs gap-1.5">
        <PlusCircle className="h-3.5 w-3.5" /> Add Material
      </Button>
    </div>
  );
};

const renderSubProceduresFields = (
  subProcedures: string[],
  setSubProcedures: React.Dispatch<React.SetStateAction<string[]>>,
  isSubmitting: boolean
) => {
  const handleStepChange = (index: number, value: string) => {
    const newSteps = [...subProcedures];
    newSteps[index] = value;
    setSubProcedures(newSteps);
  };

  const addStep = () => {
    setSubProcedures([...subProcedures, '']);
  };

  const removeStep = (index: number) => {
    setSubProcedures(subProcedures.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs sm:text-sm font-medium">Clinical Sub-procedures</Label>
        <span className="text-2xs text-muted-foreground">{subProcedures.length} steps</span>
      </div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {subProcedures.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground font-mono w-4 text-right shrink-0">{index + 1}.</span>
            <Input
              value={step}
              onChange={(e) => handleStepChange(index, e.target.value)}
              placeholder={`Step ${index + 1} (e.g. Access cavity preparation)`}
              disabled={isSubmitting}
              className="h-8 text-xs sm:text-sm"
            />
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeStep(index)} disabled={isSubmitting}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={isSubmitting} className="h-7 text-xs gap-1.5">
        <PlusCircle className="h-3.5 w-3.5" /> Add Step
      </Button>
    </div>
  );
};


export default function ProceduresPage() {
  const { user, clinicId, loading, clinicLoading } = useUser();
  const noClinic = user && !clinicId && !loading && !clinicLoading;
  const db = useFirestore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'today' | 'catalogue'>('today');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expandedWorkDonePatients, setExpandedWorkDonePatients] = useState<Record<string, boolean>>({});
  const [workDoneSearchQuery, setWorkDoneSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProcedure, setNewProcedure] = useState(initialProcedureFormData);
  const [newProcedureMaterials, setNewProcedureMaterials] = useState<string[]>([]);
  const [newProcedureSubProcedures, setNewProcedureSubProcedures] = useState<string[]>([]);

  const [selectedProcedureToLink, setSelectedProcedureToLink] = useState<Procedure | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [patientToLink, setPatientToLink] = useState<string>('');
  const [toothNumberToLink, setToothNumberToLink] = useState('');
  const [quantityToLink, setQuantityToLink] = useState(1);

  const [procedureToDelete, setProcedureToDelete] = useState<Procedure | null>(null);

  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedProcedureData, setEditedProcedureData] = useState(initialProcedureFormData);
  const [editedProcedureMaterials, setEditedProcedureMaterials] = useState<string[]>([]);
  const [editedProcedureSubProcedures, setEditedProcedureSubProcedures] = useState<string[]>([]);
  const [expandedProcSubProcedures, setExpandedProcSubProcedures] = useState<Record<string, boolean>>({});

  // Sub-procedure Note Dialog State
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [selectedNoteTarget, setSelectedNoteTarget] = useState<{
    patientId: string;
    patientName: string;
    procedureId: string;
    procedureName: string;
    toothNumber?: string;
    stepName: string;
    existingNote?: string;
  } | null>(null);
  const [subStepNoteInput, setSubStepNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [subStepToDelete, setSubStepToDelete] = useState<{
    patientId: string;
    patientName: string;
    procedureId: string;
    procedureName: string;
    toothNumber?: string;
    stepName: string;
  } | null>(null);

  useEffect(() => {
    if (!db || !clinicId || !user) {
      setIsLoading(false);
      return;
    }

    const patientsColRef = collection(db, "clinics", clinicId, "patients");
    const unsubPatients = onSnapshot(patientsColRef, (snapshot) => {
      setPatients(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Patient)).sort((a, b) => a.firstName.localeCompare(b.firstName)));
    }, (err) => console.warn("Could not fetch patients for linking:", err));

    const proceduresColRef = collection(db, "clinics", clinicId, "procedures");
    const unsubProcedures = onSnapshot(proceduresColRef, async (snapshot) => {
      setIsLoading(true);
      const fetchedProcedures = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Procedure));

      // This check is simplified. In a real app, you might use a more robust versioning/flag system.
      if (fetchedProcedures.length === 0) {
        toast({ title: 'Setting up Procedures', description: 'Populating standard dental procedures...' });
        await seedInitialProcedures(clinicId, MASTER_PROCEDURE_PRESET);
        toast({ title: 'Procedures Ready', description: 'Standard procedures have been added.' });
        // The listener will re-fire with the new data, so we don't need to manually set state here.
      } else {
        // Reconcile and ensure standard procedures have the updated smaller list
        const updatedProcedures = fetchedProcedures.map(proc => {
          const presetSteps = getPresetSubProcedures(proc.name);
          if (presetSteps.length > 0 && (!proc.subProcedures || proc.subProcedures.length !== presetSteps.length)) {
            updateProcedureService(clinicId, proc.id, { subProcedures: presetSteps }).catch(console.warn);
            return { ...proc, subProcedures: presetSteps };
          }
          return proc;
        });

        setProcedures(updatedProcedures.sort((a, b) => a.category && b.category && a.category !== b.category ? a.category.localeCompare(b.category) : a.name.localeCompare(b.name)));
        setError(null);
        setIsLoading(false);
      }
    }, (err) => {
      const permissionError = new FirestorePermissionError({ path: proceduresColRef.path, operation: 'list' });
      errorEmitter.emit('permission-error', permissionError);
      setError("Failed to fetch procedures. Check permissions.");
      setIsLoading(false);
    });

    const transactionsColRef = collection(db, "clinics", clinicId, "transactions");
    const unsubTransactions = onSnapshot(transactionsColRef, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
    }, (err) => console.warn("Could not fetch transactions:", err));

    const appointmentsColRef = collection(db, "clinics", clinicId, "appointments");
    const unsubAppointments = onSnapshot(appointmentsColRef, (snapshot) => {
      setAppointments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
    }, (err) => console.warn("Could not fetch appointments:", err));

    return () => {
      unsubProcedures();
      unsubPatients();
      unsubTransactions();
      unsubAppointments();
    };
  }, [db, user, clinicId, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProcedure(prev => ({ ...prev, [name]: name === 'cost' || name === 'durationMinutes' ? parseFloat(value) || 0 : value }));
    if (name === 'name' && newProcedureSubProcedures.length === 0) {
      const defaultSteps = getPresetSubProcedures(value);
      if (defaultSteps.length > 0) {
        setNewProcedureSubProcedures(defaultSteps);
      }
    }
  }, [newProcedureSubProcedures.length]);

  const handleSelectChange = useCallback((value: ProcedureCategory) => setNewProcedure(prev => ({ ...prev, category: value })), []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !user || !clinicId) {
      toast({ title: "Error", description: "Database or user not available.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addProcedure(clinicId, {
        ...newProcedure,
        materials: newProcedureMaterials,
        subProcedures: newProcedureSubProcedures.filter(s => s.trim().length > 0),
      });
      toast({ title: "Procedure Added", description: `${newProcedure.name} has been added.` });
      setNewProcedure(initialProcedureFormData);
      setNewProcedureMaterials([]);
      setNewProcedureSubProcedures([]);
      setIsAddFormOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: "Could not add procedure. Check permissions.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLinkToPatient = async () => {
    if (!selectedProcedureToLink || !patientToLink || !user || !clinicId) {
      toast({ title: "Error", description: "Please select a procedure and a patient.", variant: "destructive" });
      return;
    }
    const patient = patients.find(p => p.id === patientToLink);
    if (!patient) {
      toast({ title: "Error", description: "Patient not found.", variant: "destructive" });
      return;
    }

    const newLinkedProcedure: LinkedProcedure = {
      procedureId: selectedProcedureToLink.id,
      procedureName: selectedProcedureToLink.name,
      cost: selectedProcedureToLink.cost,
      date: new Date().toISOString(),
      quantity: quantityToLink,
      subProcedures: getPresetSubProcedures(selectedProcedureToLink.name).map(name => ({ name, completed: false })),
      ...(toothNumberToLink.trim() && { toothNumber: toothNumberToLink.trim() }),
    };

    const updatedLinkedProcedures = [...(patient.linkedProcedures || []), newLinkedProcedure];

    const success = await updatePatient(clinicId, patient.id, { linkedProcedures: updatedLinkedProcedures });

    if (success) {
      toast({ title: "Procedure Linked", description: `${selectedProcedureToLink.name} linked to ${patient.firstName}. This will update their billable amount.` });
      setIsLinkDialogOpen(false);
      setSelectedProcedureToLink(null);
      setPatientToLink('');
      setToothNumberToLink('');
      setQuantityToLink(1);
    } else {
      toast({ title: "Linking Failed", description: "Could not link procedure. Check security rules.", variant: "destructive" });
    }
  };

  const handleDeleteProcedure = async () => {
    if (!procedureToDelete || !db || !user || !clinicId) return;
    try {
      await deleteProcedure(clinicId, procedureToDelete.id);
      toast({ title: "Procedure Deleted", description: `${procedureToDelete.name} has been removed.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not delete procedure.", variant: "destructive" });
    } finally {
      setProcedureToDelete(null);
    }
  };

  const handleOpenEditDialog = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    setEditedProcedureData({ ...initialProcedureFormData, ...procedure });
    setEditedProcedureMaterials(procedure.materials || []);
    const existingSteps = (procedure.subProcedures && procedure.subProcedures.length > 0)
      ? procedure.subProcedures
      : getPresetSubProcedures(procedure.name);
    setEditedProcedureSubProcedures(existingSteps);
    setIsEditDialogOpen(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedProcedureData(prev => ({ ...prev, [name]: name === 'cost' || name === 'durationMinutes' ? parseFloat(value) || 0 : value }));
  };

  const handleEditSelectChange = (value: ProcedureCategory) => setEditedProcedureData(prev => ({ ...prev, category: value }));

  const handleUpdateProcedure = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProcedure || !db || !user || !clinicId) return;
    setIsSubmitting(true);
    try {
      await updateProcedureService(clinicId, editingProcedure.id, {
        ...editedProcedureData,
        materials: editedProcedureMaterials,
        subProcedures: editedProcedureSubProcedures.filter(s => s.trim().length > 0),
      });
      toast({ title: "Procedure Updated", description: `${editedProcedureData.name} has been updated.` });
      setIsEditDialogOpen(false);
      setEditingProcedure(null);
    } catch (err: any) {
      toast({ title: "Error", description: "Could not update procedure.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenLinkDialog = (proc: Procedure) => {
    setSelectedProcedureToLink(proc);
    setPatientToLink('');
    setToothNumberToLink('');
    setQuantityToLink(1);
    setIsLinkDialogOpen(true);
  };

  const handleOpenNoteDialog = (
    patientId: string,
    patientName: string,
    procedureId: string,
    procedureName: string,
    toothNumber: string | undefined,
    stepName: string,
    existingNote?: string
  ) => {
    setSelectedNoteTarget({
      patientId,
      patientName,
      procedureId,
      procedureName,
      toothNumber,
      stepName,
      existingNote,
    });
    setSubStepNoteInput(existingNote || '');
    setIsNoteDialogOpen(true);
  };

  const handleSaveSubStepNote = async () => {
    if (!selectedNoteTarget || !clinicId) return;
    setIsSavingNote(true);
    try {
      const patient = patients.find(p => p.id === selectedNoteTarget.patientId);
      if (!patient) throw new Error("Patient not found.");

      const updatedLinkedProcedures = (patient.linkedProcedures || []).map(lp => {
        const matchesProc = lp.procedureId === selectedNoteTarget.procedureId &&
          (selectedNoteTarget.toothNumber ? lp.toothNumber === selectedNoteTarget.toothNumber : true);
        if (!matchesProc) return lp;

        const currentSteps = reconcileSubProcedures(lp.subProcedures, lp.procedureName);
        const updatedSteps = currentSteps.map(step => {
          if (step.name.trim().toLowerCase() === selectedNoteTarget.stepName.trim().toLowerCase()) {
            return {
              ...step,
              notes: subStepNoteInput.trim() ? subStepNoteInput.trim() : undefined,
            };
          }
          return step;
        });

        return {
          ...lp,
          subProcedures: updatedSteps,
        };
      });

      const success = await updatePatient(clinicId, patient.id, { linkedProcedures: updatedLinkedProcedures });
      if (success) {
        toast({
          title: "Note Saved",
          description: `Note saved for "${selectedNoteTarget.stepName}".`,
        });
        setIsNoteDialogOpen(false);
        setSelectedNoteTarget(null);
        setSubStepNoteInput('');
      } else {
        throw new Error("Could not update patient record.");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save sub-procedure note.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const confirmDeletePatientSubStep = async () => {
    if (!clinicId || !subStepToDelete) return;
    try {
      const { patientId, procedureId, procedureName, toothNumber, stepName, patientName } = subStepToDelete;
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const updatedLinked = (patient.linkedProcedures || []).map(lp => {
        const matchesProc = (
          (procedureId && lp.procedureId === procedureId) ||
          (procedureName && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureName.trim().toLowerCase()) ||
          (procedureId && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureId.trim().toLowerCase())
        ) && (toothNumber ? lp.toothNumber === toothNumber : true);
        if (!matchesProc) return lp;

        const currentSteps = reconcileSubProcedures(lp.subProcedures, lp.procedureName);
        const updatedSteps = currentSteps.map(step => {
          if (step.name.trim().toLowerCase() === stepName.trim().toLowerCase()) {
            const { completedAt, ...rest } = step;
            return {
              ...rest,
              completed: false,
              isDeleted: true,
            };
          }
          return step;
        });

        return {
          ...lp,
          subProcedures: updatedSteps,
        };
      });

      await updatePatient(clinicId, patient.id, { linkedProcedures: updatedLinked });
      toast({
        title: "Sub-procedure Deleted",
        description: `"${stepName}" deleted for ${patientName}.`,
      });
      setSubStepToDelete(null);
    } catch (err) {
      console.error("Could not delete sub-procedure:", err);
      toast({
        title: "Error",
        description: "Failed to delete sub-procedure.",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkProcedureForPatient = async (
    patientId: string,
    procedureId: string,
    procedureName?: string,
    toothNumber?: string
  ) => {
    if (!clinicId) return;
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const updatedLinked = (patient.linkedProcedures || []).filter(lp => {
        const matchesProc = (
          (procedureId && lp.procedureId === procedureId) ||
          (procedureName && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureName.trim().toLowerCase()) ||
          (procedureId && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureId.trim().toLowerCase())
        ) && (toothNumber ? lp.toothNumber === toothNumber : true);
        return !matchesProc;
      });

      await updatePatient(clinicId, patient.id, { linkedProcedures: updatedLinked });
      toast({
        title: "Procedure Removed",
        description: `Procedure removed from ${patient.firstName}'s record.`,
      });
    } catch (err) {
      console.error("Could not remove procedure:", err);
      toast({
        title: "Error",
        description: "Failed to remove procedure.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePatientSubStep = async (
    patientId: string,
    procedureId: string,
    procedureName: string,
    toothNumber: string | undefined,
    stepName: string,
    currentCompleted: boolean
  ) => {
    if (!clinicId) return;
    try {
      const patient = patients.find(p => p.id === patientId);
      if (!patient) return;

      const newCompleted = !currentCompleted;
      const now = new Date().toISOString();

      const updatedLinked = (patient.linkedProcedures || []).map(lp => {
        const matchesProc = (
          (procedureId && lp.procedureId === procedureId) ||
          (procedureName && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureName.trim().toLowerCase()) ||
          (procedureId && lp.procedureName && lp.procedureName.trim().toLowerCase() === procedureId.trim().toLowerCase())
        ) && (toothNumber ? lp.toothNumber === toothNumber : true);
        if (!matchesProc) return lp;

        const currentSteps = reconcileSubProcedures(lp.subProcedures, lp.procedureName);
        const updatedSteps = currentSteps.map(step => {
          if (step.name.trim().toLowerCase() === stepName.trim().toLowerCase()) {
            if (newCompleted) {
              return {
                ...step,
                completed: true,
                completedAt: now,
              };
            } else {
              const { completedAt, ...rest } = step;
              return {
                ...rest,
                completed: false,
              };
            }
          }
          return step;
        });

        return {
          ...lp,
          subProcedures: updatedSteps,
        };
      });

      const success = await updatePatient(clinicId, patient.id, { linkedProcedures: updatedLinked });
      if (success) {
        toast({
          title: newCompleted ? "Step Completed" : "Step Reopened",
          description: `"${stepName}" marked as ${newCompleted ? "completed" : "pending"}.`,
        });
      } else {
        toast({
          title: "Update Failed",
          description: "Could not update sub-procedure status.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Could not toggle sub-procedure status:", err);
      toast({
        title: "Error",
        description: "Failed to toggle sub-procedure status.",
        variant: "destructive",
      });
    }
  };

  const groupedProcedures = useMemo(() => {
    const filtered = procedures.filter(proc => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return proc.name.toLowerCase().includes(query) || (proc.description || '').toLowerCase().includes(query);
    });

    return filtered.reduce((acc, proc) => {
      const category = proc.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(proc);
      return acc;
    }, {} as Record<string, Procedure[]>);
  }, [procedures, searchQuery]);

  const workDoneList = useMemo(() => {
    return patients.map(patient => {
      const linkedProcs = patient.linkedProcedures || [];

      const todayProcedures: {
        procedureId: string;
        procedureName: string;
        toothNumber?: string;
        cost: number;
        date?: string;
        stepsCompletedToday: (ProcedureSubStep & { completedAt?: string })[];
        stepsCompletedEarlier: (ProcedureSubStep & { completedAt?: string })[];
        stepsPending: ProcedureSubStep[];
        totalSteps: number;
        isInitiatedToday: boolean;
      }[] = [];

      const previousProcedures: {
        procedureId: string;
        procedureName: string;
        toothNumber?: string;
        date?: string;
        cost: number;
        stepsCompleted: (ProcedureSubStep & { completedAt?: string })[];
        stepsPending: ProcedureSubStep[];
        totalSteps: number;
      }[] = [];

      let totalStepsDoneToday = 0;

      linkedProcs.forEach(proc => {
        const subSteps = reconcileSubProcedures(proc.subProcedures, proc.procedureName);
        const procDateObj = proc.date ? new Date(proc.date) : null;
        const isProcToday = procDateObj ? isSameDay(procDateObj, selectedDate) : false;

        const stepsCompletedToday: (ProcedureSubStep & { completedAt?: string })[] = [];
        const stepsCompletedEarlier: (ProcedureSubStep & { completedAt?: string })[] = [];
        const pendingList: ProcedureSubStep[] = [];

        subSteps.forEach(step => {
          if (step.completed) {
            const stepDateObj = step.completedAt ? new Date(step.completedAt) : null;
            if (stepDateObj && isSameDay(stepDateObj, selectedDate)) {
              stepsCompletedToday.push(step);
              totalStepsDoneToday++;
            } else if (!stepDateObj && isProcToday) {
              stepsCompletedToday.push(step);
              totalStepsDoneToday++;
            } else {
              stepsCompletedEarlier.push(step);
            }
          } else {
            pendingList.push(step);
          }
        });

        // Check if there was an appointment on selectedDate for this procedure
        const hadAppointmentToday = appointments.some(app =>
          app.patientId === patient.id &&
          isSameDay(new Date(app.date), selectedDate) &&
          app.procedureDetails?.some(pd => pd.procedureId === proc.procedureId)
        );

        if (stepsCompletedToday.length > 0 || isProcToday || hadAppointmentToday) {
          todayProcedures.push({
            procedureId: proc.procedureId,
            procedureName: proc.procedureName,
            toothNumber: proc.toothNumber,
            cost: (proc.cost || 0) * (proc.quantity || 1),
            date: proc.date,
            stepsCompletedToday,
            stepsCompletedEarlier,
            stepsPending: pendingList,
            totalSteps: subSteps.length,
            isInitiatedToday: isProcToday,
          });
        } else if (stepsCompletedEarlier.length > 0 || (procDateObj && procDateObj < startOfDay(selectedDate))) {
          previousProcedures.push({
            procedureId: proc.procedureId,
            procedureName: proc.procedureName,
            toothNumber: proc.toothNumber,
            date: proc.date,
            cost: (proc.cost || 0) * (proc.quantity || 1),
            stepsCompleted: stepsCompletedEarlier,
            stepsPending: pendingList,
            totalSteps: subSteps.length,
          });
        }
      });

      // Also check if patient had an appointment today
      const todayAppointments = appointments.filter(app =>
        app.patientId === patient.id &&
        isSameDay(new Date(app.date), selectedDate)
      );

      const hasWorkToday = todayProcedures.length > 0 || todayAppointments.length > 0;

      return {
        patient,
        todayProcedures,
        previousProcedures,
        totalStepsDoneToday,
        hasWorkToday,
        todayAppointments,
      };
    }).filter(item => item.hasWorkToday);
  }, [patients, selectedDate, appointments]);

  const filteredWorkDoneList = useMemo(() => {
    if (!workDoneSearchQuery) return workDoneList;
    const q = workDoneSearchQuery.toLowerCase();
    return workDoneList.filter(({ patient, todayProcedures }) => {
      const name = `${patient.firstName} ${patient.lastName}`.toLowerCase();
      const phone = (patient.contactNumber || '').toLowerCase();
      const procMatch = todayProcedures.some(tp => tp.procedureName.toLowerCase().includes(q));
      return name.includes(q) || phone.includes(q) || procMatch;
    });
  }, [workDoneList, workDoneSearchQuery]);

  const renderContent = () => {
    if (noClinic) return <ClinicSetupAlert sectionName="Procedures" />;
    if (isLoading) return <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-4 text-muted-foreground">Loading procedures...</p></div>;
    if (error) return <Alert variant="destructive"><ServerCrash className="h-5 w-5" /><AlertTitle>Database Error</AlertTitle><ShadAlertDescription>{error}</ShadAlertDescription></Alert>;

    const hasResults = Object.keys(groupedProcedures).length > 0;

    if (!hasResults) return <div className="flex flex-col items-center justify-center text-center p-6 min-h-[150px] border rounded-lg bg-muted/30"><p className="text-lg font-medium text-muted-foreground mb-2">No procedures found.</p><p className="text-sm text-muted-foreground mb-4">{searchQuery ? "Try adjusting your search query." : 'Click "Add New Procedure" to get started.'}</p></div>;

    return (
      <Accordion type="multiple" className="w-full space-y-3">
        {Object.entries(groupedProcedures).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, procs]) => (
          <AccordionItem
            value={category}
            key={category}
            className="border border-border/80 dark:border-border/60 rounded-xl bg-card shadow-xs overflow-hidden transition-all data-[state=open]:shadow-md data-[state=open]:border-primary/40 mb-3"
          >
            <AccordionTrigger className="px-3.5 py-3 sm:px-4 sm:py-3.5 text-sm sm:text-base font-semibold hover:no-underline hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <span>{category}</span>
                <Badge variant="secondary" className="text-2xs px-1.5 py-0.5">{procs.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-2.5 sm:p-4 bg-muted/20 dark:bg-muted/10 border-t border-border/60">
              <div className="space-y-3">
                {procs.map(proc => (
                  <div key={proc.id} className="border border-border/70 shadow-xs rounded-xl p-3.5 sm:p-4 bg-card transition-all space-y-3">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm sm:text-base text-foreground truncate">{proc.name}</h4>
                          <Badge variant="outline" className="text-2xs font-semibold text-primary border-primary/30">₹{proc.cost.toLocaleString()}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{proc.description || 'No description available.'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto shrink-0">
                        {proc.videoUrl && (
                          <a href={proc.videoUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-7 sm:h-8 text-xs px-2 sm:px-2.5">
                              <Video className="mr-1 h-3.5 w-3.5 text-red-500" /> Demo
                            </Button>
                          </a>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleOpenLinkDialog(proc)} className="h-7 sm:h-8 text-xs px-2 sm:px-2.5">
                          <Link2 className="mr-1 h-3.5 w-3.5" /> Link to Patient
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <p><strong>Est. Duration:</strong> {proc.durationMinutes ? `${proc.durationMinutes} mins` : 'N/A'}</p>
                      {proc.materials && proc.materials.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="font-medium text-foreground">Materials:</span>
                          {proc.materials.map((material, i) => (
                            <Badge key={i} variant="secondary" className="text-2xs px-1.5 py-0.5">{material}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {(() => {
                      const steps = (proc.subProcedures && proc.subProcedures.length > 0) ? proc.subProcedures : getPresetSubProcedures(proc.name);
                      if (!steps || steps.length === 0) return null;
                      const isExpanded = expandedProcSubProcedures[proc.id] ?? false;

                      return (
                        <div className="pt-2 border-t border-border/40">
                          <button
                            type="button"
                            onClick={() => setExpandedProcSubProcedures(prev => ({ ...prev, [proc.id]: !prev[proc.id] }))}
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground hover:text-primary transition-colors py-1 group cursor-pointer select-none"
                          >
                            <span className="text-2xs text-muted-foreground group-hover:text-primary transition-transform">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span className="font-semibold text-xs">{proc.name}</span>
                            <span className="text-3xs text-muted-foreground font-normal ml-1">
                              ({steps.length} sub-procedures) {isExpanded ? '— collapse' : '— expand'}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="ml-3 pl-3 border-l-2 border-primary/40 mt-1 mb-1.5 space-y-1 py-0.5">
                              {steps.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs text-foreground/90 py-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-primary/70 shrink-0" />
                                  <span className="font-normal text-xs">{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-1.5 pt-2 border-t border-border/50">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEditDialog(proc)} className="h-7 sm:h-8 text-xs px-2 sm:px-2.5">
                        <FilePenLine className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setProcedureToDelete(proc)} className="h-7 sm:h-8 text-xs px-2 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the procedure "{procedureToDelete?.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setProcedureToDelete(null)}>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteProcedure}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Add Procedure Dialog */}
      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-xl max-h-[92vh] rounded-2xl sm:rounded-xl p-3 sm:p-6 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
          <DialogHeader className="px-1 pt-0.5 pb-2.5 sm:pb-4 border-b shrink-0">
            <DialogTitle className="text-base sm:text-xl font-bold">Add New Dental Procedure</DialogTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">Define a new procedure, clinical sub-procedures, and required materials.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2.5 sm:py-4 space-y-3 sm:space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs sm:text-sm font-medium">Procedure Name *</Label>
                <Input id="name" name="name" value={newProcedure.name} onChange={handleInputChange} required disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Description (Optional)</Label>
                <Textarea id="description" name="description" value={newProcedure.description || ''} onChange={handleInputChange} disabled={isSubmitting} className="min-h-[44px] sm:min-h-[56px] text-xs sm:text-sm py-1.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-xs sm:text-sm font-medium">Category</Label>
                  <Select name="category" value={newProcedure.category} onValueChange={handleSelectChange}><SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{(['Consultation', 'Restorative', 'Endodontic', 'Prosthodontic', 'Orthodontic', 'Surgical', 'Periodontic', 'Preventive', 'Cosmetic', 'Pediatric', 'Implantology', 'Adjunctive', 'Other'] as ProcedureCategory[]).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cost" className="text-xs sm:text-sm font-medium">Cost (₹) *</Label>
                  <Input id="cost" name="cost" type="number" value={newProcedure.cost} onChange={handleInputChange} required min="0" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="durationMinutes" className="text-xs sm:text-sm font-medium">Duration (minutes)</Label>
                <Input id="durationMinutes" name="durationMinutes" type="number" value={newProcedure.durationMinutes || 0} onChange={handleInputChange} min="0" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="videoUrl" className="text-xs sm:text-sm font-medium">Demo Video Link (Optional)</Label>
                <Input id="videoUrl" name="videoUrl" value={newProcedure.videoUrl || ''} onChange={handleInputChange} placeholder="e.g., https://youtube.com/watch?v=..." disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="border-t border-border/60 pt-3">{renderSubProceduresFields(newProcedureSubProcedures, setNewProcedureSubProcedures, isSubmitting)}</div>
              <div className="border-t border-border/60 pt-3">{renderMaterialsFields(newProcedureMaterials, setNewProcedureMaterials, isSubmitting)}</div>
            </div>
            <DialogFooter className="px-1 pt-2.5 pb-0.5 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
              <DialogClose asChild><Button type="button" variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></DialogClose>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Adding...</> : 'Add Procedure'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Link Procedure Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={(open) => { if (!open) setSelectedProcedureToLink(null); setIsLinkDialogOpen(open); }}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-md rounded-2xl sm:rounded-xl p-3.5 sm:p-6 shadow-2xl border border-border/80">
          <DialogHeader className="pb-2 border-b"><DialogTitle className="text-base sm:text-lg">Link "{selectedProcedureToLink?.name}"</DialogTitle></DialogHeader>
          <div className="py-3 space-y-3">
            <div className="space-y-1">
              <Label htmlFor="patientToLink" className="text-xs sm:text-sm font-medium">Select Patient</Label>
              <Select value={patientToLink} onValueChange={setPatientToLink}>
                <SelectTrigger id="patientToLink" className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select a patient" /></SelectTrigger>
                <SelectContent>{patients.length === 0 ? <div className="p-2 text-center text-xs text-muted-foreground">No patients found</div> : patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="toothNumberToLink" className="text-xs sm:text-sm font-medium">Tooth Number / Notes (Optional)</Label>
              <Input id="toothNumberToLink" value={toothNumberToLink} onChange={(e) => setToothNumberToLink(e.target.value)} placeholder="e.g., 14, 25 or notes" className="h-8 sm:h-9 text-xs sm:text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="quantityToLink" className="text-xs sm:text-sm font-medium">Quantity</Label>
              <Input id="quantityToLink" type="number" value={quantityToLink} onChange={(e) => setQuantityToLink(parseInt(e.target.value) || 1)} min="1" className="h-8 sm:h-9 text-xs sm:text-sm" />
            </div>
          </div>
          <DialogFooter className="pt-2.5 border-t flex flex-row items-center justify-end gap-2">
            <DialogClose asChild><Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></DialogClose>
            <Button size="sm" className="h-8 text-xs" onClick={handleLinkToPatient}>Link Procedure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Procedure Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); if (!isOpen) setEditingProcedure(null); }}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-xl max-h-[92vh] rounded-2xl sm:rounded-xl p-3 sm:p-6 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
          <DialogHeader className="px-1 pt-0.5 pb-2.5 sm:pb-4 border-b shrink-0">
            <DialogTitle className="text-base sm:text-xl font-bold">Edit Procedure: {editingProcedure?.name}</DialogTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">Modify the details for this procedure.</CardDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProcedure} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-2.5 sm:py-4 space-y-3 sm:space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="editName" className="text-xs sm:text-sm font-medium">Procedure Name *</Label>
                <Input id="editName" name="name" value={editedProcedureData.name} onChange={handleEditInputChange} required disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editDescription" className="text-xs sm:text-sm font-medium">Description (Optional)</Label>
                <Textarea id="editDescription" name="description" value={editedProcedureData.description || ''} onChange={handleEditInputChange} disabled={isSubmitting} className="min-h-[44px] sm:min-h-[56px] text-xs sm:text-sm py-1.5" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="editCategory" className="text-xs sm:text-sm font-medium">Category</Label>
                  <Select name="category" value={editedProcedureData.category} onValueChange={handleEditSelectChange} disabled={isSubmitting}><SelectTrigger id="editCategory" className="h-8 sm:h-9 text-xs sm:text-sm"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{(['Consultation', 'Restorative', 'Endodontic', 'Prosthodontic', 'Orthodontic', 'Surgical', 'Periodontic', 'Preventive', 'Cosmetic', 'Pediatric', 'Implantology', 'Adjunctive', 'Other'] as ProcedureCategory[]).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editCost" className="text-xs sm:text-sm font-medium">Cost (₹) *</Label>
                  <Input id="editCost" name="cost" type="number" value={editedProcedureData.cost} onChange={handleEditInputChange} required min="0" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="editDurationMinutes" className="text-xs sm:text-sm font-medium">Duration (minutes)</Label>
                <Input id="editDurationMinutes" name="durationMinutes" type="number" value={editedProcedureData.durationMinutes || 0} onChange={handleEditInputChange} min="0" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="editVideoUrl" className="text-xs sm:text-sm font-medium">Demo Video Link (Optional)</Label>
                <Input id="editVideoUrl" name="videoUrl" value={editedProcedureData.videoUrl || ''} onChange={handleEditInputChange} placeholder="e.g., https://youtube.com/watch?v=..." disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
              </div>
              <div className="border-t border-border/60 pt-3">{renderSubProceduresFields(editedProcedureSubProcedures, setEditedProcedureSubProcedures, isSubmitting)}</div>
              <div className="border-t border-border/60 pt-3">{renderMaterialsFields(editedProcedureMaterials, setEditedProcedureMaterials, isSubmitting)}</div>
            </div>
            <DialogFooter className="px-1 pt-2.5 pb-0.5 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
              <DialogClose asChild><Button type="button" variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></DialogClose>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</> : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-procedure Clinical Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-md rounded-2xl sm:rounded-xl p-3.5 sm:p-5 shadow-2xl border border-border/80">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Sub-procedure Note</span>
            </DialogTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {selectedNoteTarget?.stepName} &bull; {selectedNoteTarget?.patientName} ({selectedNoteTarget?.procedureName}{selectedNoteTarget?.toothNumber ? ` #${selectedNoteTarget.toothNumber}` : ''})
            </CardDescription>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <Label htmlFor="subStepNote" className="text-xs font-medium">
              Clinical Notes &amp; Observations
            </Label>
            <Textarea
              id="subStepNote"
              value={subStepNoteInput}
              onChange={(e) => setSubStepNoteInput(e.target.value)}
              placeholder="e.g., Working length MB: 21mm, DB: 20mm; 3% NaOCl irrigation; composite shade A2..."
              rows={4}
              className="text-xs sm:text-sm min-h-[90px]"
              autoFocus
            />
            <p className="text-3xs text-muted-foreground">
              These notes are saved directly to this patient's procedure record and are accessible across appointments and history.
            </p>
          </div>
          <DialogFooter className="pt-2.5 border-t flex flex-row items-center justify-between sm:justify-end gap-2">
            {subStepNoteInput.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-destructive hover:bg-destructive/10 mr-auto"
                onClick={() => setSubStepNoteInput('')}
              >
                Clear Note
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                Cancel
              </Button>
            </DialogClose>
            <Button
              size="sm"
              className="h-8 text-xs font-medium"
              onClick={handleSaveSubStepNote}
              disabled={isSavingNote}
            >
              {isSavingNote ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving...</> : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog to Delete Sub-procedure for this patient */}
      <AlertDialog open={!!subStepToDelete} onOpenChange={(open) => { if (!open) setSubStepToDelete(null); }}>
        <AlertDialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-md rounded-2xl sm:rounded-xl p-4 sm:p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Delete subprocedure for this patient?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{subStepToDelete?.stepName}"</span> from <span className="font-semibold text-foreground">{subStepToDelete?.patientName}</span>'s {subStepToDelete?.procedureName} record? This step will be removed specifically for this patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel onClick={() => setSubStepToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeletePatientSubStep}
            >
              Delete Subprocedure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main Tabs Container: Procedure Performed Today / Brief Overview vs Procedures Catalogue */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'today' | 'catalogue')} className="w-full space-y-4">
        {/* Top Header with Title, Actions, and Switch Tabs Menu */}
        <div className="space-y-3 no-print pb-3 border-b border-border/70">
          {/* Top Row: Procedures Title on Left, Actions on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
              <ClipboardList className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-special3" />
              Procedures
            </h1>

            {/* Action buttons on the right side */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {/* Add Procedure Button */}
              <Button
                onClick={() => { setNewProcedure(initialProcedureFormData); setNewProcedureMaterials([]); setNewProcedureSubProcedures([]); setIsAddFormOpen(true); }}
                disabled={!user || !clinicId}
                className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
              >
                <ListPlus className="mr-1.5 sm:mr-2 h-4 w-4" />
                <span className="sm:hidden">Add</span>
                <span className="hidden sm:inline">Add New Procedure</span>
              </Button>
            </div>
          </div>

          {/* Bottom Row: Switch Tabs Menu copied exactly from patients' tab */}
          <div className="flex justify-center no-print pt-1">
            <TabsList className="h-9 sm:h-10">
              <TabsTrigger value="today" className="text-xs sm:text-sm px-3 sm:px-4">Procedure Performed Today</TabsTrigger>
              <TabsTrigger value="catalogue" className="text-xs sm:text-sm px-3 sm:px-4">All Procedures</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: PROCEDURE PERFORMED TODAY (BRIEF OVERVIEW TOGGLE) */}
        {/* ========================================================================= */}
        <TabsContent value="today" className="mt-4 space-y-4">
          {/* Date Changing Menu right under Procedure Performed Today tab */}
          <div className="flex items-center justify-center gap-2 pb-1">
            <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(prev => subDays(prev, 1))} title="Previous day">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs font-semibold px-3 h-7 flex items-center justify-center rounded-md bg-background shadow-2xs min-w-[130px] text-center">
                {isToday(selectedDate) ? `Today (${format(selectedDate, 'dd MMM')})` : format(selectedDate, 'dd MMM yyyy')}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(prev => addDays(prev, 1))} title="Next day">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday(selectedDate) && (
                <Button variant="outline" size="sm" className="h-7 text-xs px-2.5 font-medium ml-1" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
              )}
            </div>
          </div>

          {/* Search bar & summary actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients by name, phone, or procedure..."
                value={workDoneSearchQuery}
                onChange={(e) => setWorkDoneSearchQuery(e.target.value)}
                className="pl-9 h-8 sm:h-9 text-xs"
              />
            </div>

            {filteredWorkDoneList.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-normal"
                  onClick={() => {
                    const allExpanded = filteredWorkDoneList.every(i => expandedWorkDonePatients[i.patient.id]);
                    const next: Record<string, boolean> = {};
                    filteredWorkDoneList.forEach(i => {
                      next[i.patient.id] = !allExpanded;
                    });
                    setExpandedWorkDonePatients(next);
                  }}
                >
                  {filteredWorkDoneList.every(i => expandedWorkDonePatients[i.patient.id]) ? 'Collapse All' : 'Expand All'}
                </Button>
                <Badge variant="outline" className="text-xs font-normal py-1">
                  {filteredWorkDoneList.length} patient{filteredWorkDoneList.length === 1 ? '' : 's'} recorded
                </Badge>
              </div>
            )}
          </div>

          {/* List of Patients with Procedures Performed */}
          {filteredWorkDoneList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed rounded-xl bg-muted/20 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                No Procedures Recorded for {isToday(selectedDate) ? 'Today' : format(selectedDate, 'dd MMMM yyyy')}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Procedures and sub-procedure milestones completed for patients on this day will appear here automatically.
              </p>
              <div className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('catalogue')} className="h-8 text-xs">
                  <Stethoscope className="mr-1.5 h-3.5 w-3.5 text-primary" /> Browse All Procedures
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkDoneList.map(({ patient, todayProcedures, previousProcedures, totalStepsDoneToday }) => {
                const isExpanded = expandedWorkDonePatients[patient.id] ?? false;

                return (
                  <Card
                    key={patient.id}
                    className="border border-border/80 shadow-xs rounded-xl overflow-hidden transition-all bg-card"
                  >
                    {/* Collapsed / Toggle Card Header */}
                    <div
                      onClick={() => setExpandedWorkDonePatients(prev => ({ ...prev, [patient.id]: !prev[patient.id] }))}
                      className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                          {patient.firstName[0]?.toUpperCase()}{patient.lastName[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-xs sm:text-sm text-foreground truncate">
                              {patient.firstName} {patient.lastName}
                            </h3>
                            {patient.contactNumber && (
                              <span className="text-2xs text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {patient.contactNumber}
                              </span>
                            )}
                          </div>

                          {/* Procedures summary pill */}
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {todayProcedures.map((tp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-2xs font-normal">
                                {tp.procedureName} {tp.toothNumber ? `(#${tp.toothNumber})` : ''}
                              </Badge>
                            ))}
                            {totalStepsDoneToday > 0 && (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 text-3xs font-semibold">
                                ✓ {totalStepsDoneToday} step{totalStepsDoneToday === 1 ? '' : 's'} completed today
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right summary + toggle chevron */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">
                            {previousProcedures.length > 0 ? `${previousProcedures.length} prior procedure(s)` : 'First visit'}
                          </span>
                        </div>
                        <div className="h-7 w-7 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-foreground" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content Menu */}
                    {isExpanded && (
                      <div className="p-3.5 sm:p-4 border-t border-border/70 bg-muted/15 dark:bg-muted/10 space-y-4">

                        {/* 1. PROCEDURE PERFORMED TODAY */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>Procedure Performed {isToday(selectedDate) ? 'Today' : format(selectedDate, 'dd MMM')}</span>
                            </h4>
                            <span className="text-2xs text-muted-foreground">
                              {todayProcedures.length} procedure{todayProcedures.length === 1 ? '' : 's'} worked on
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {todayProcedures.map((tp, idx) => (
                              <div key={idx} className="p-3 rounded-xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-xs sm:text-sm text-foreground">{tp.procedureName}</span>
                                    {tp.toothNumber && (
                                      <Badge variant="outline" className="text-3xs px-1.5 py-0 border-emerald-400 text-emerald-800 dark:text-emerald-300">
                                        Tooth #{tp.toothNumber}
                                      </Badge>
                                    )}
                                    {tp.isInitiatedToday && (
                                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-3xs py-0">
                                        Initiated Today
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">
                                      ₹{tp.cost.toLocaleString()}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      title={`Remove ${tp.procedureName} from ${patient.firstName}'s record`}
                                      onClick={() => handleUnlinkProcedureForPatient(patient.id, tp.procedureId, tp.procedureName, tp.toothNumber)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Completed Sub-procedures Today */}
                                {tp.stepsCompletedToday.length > 0 ? (
                                  <div className="space-y-1 pt-0.5">
                                    <p className="text-2xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                      Sub-procedures Completed Today:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {tp.stepsCompletedToday.map((step, sIdx) => (
                                        <div key={sIdx} className="flex flex-col gap-1 px-2.5 py-1.5 rounded-lg bg-background border border-emerald-300/80 dark:border-emerald-800 text-xs shadow-2xs">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <button
                                                type="button"
                                                onClick={() => handleTogglePatientSubStep(patient.id, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, true)}
                                                className="shrink-0 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                                title="Click to untick / reopen this step"
                                              >
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                              </button>
                                              <span className="font-medium text-xs text-foreground truncate">{step.name}</span>
                                              {step.isCustom && <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">Custom</Badge>}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, step.notes)}
                                                className={cn(
                                                  "inline-flex items-center gap-1 text-3xs px-1.5 py-0.5 rounded border transition-colors",
                                                  step.notes
                                                    ? "bg-amber-100/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-medium"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border/60"
                                                )}
                                                title={step.notes ? "Edit sub-procedure note" : "Add note for this sub-procedure"}
                                              >
                                                <StickyNote className={cn("h-3 w-3", step.notes ? "text-amber-600 dark:text-amber-400 fill-amber-500/20" : "text-muted-foreground")} />
                                                <span>{step.notes ? "Note" : "+ Note"}</span>
                                              </button>
                                              <span className="text-3xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.5 rounded-full shrink-0">
                                                {step.completedAt ? format(new Date(step.completedAt), 'hh:mm a') : 'Today'}
                                              </span>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <button
                                                    type="button"
                                                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                                                    title="More options"
                                                  >
                                                    <MoreVertical className="h-3 w-3" />
                                                  </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="text-xs">
                                                  <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive text-xs cursor-pointer gap-2"
                                                    onClick={() => setSubStepToDelete({
                                                      patientId: patient.id,
                                                      patientName: `${patient.firstName} ${patient.lastName}`,
                                                      procedureId: tp.procedureId,
                                                      procedureName: tp.procedureName,
                                                      toothNumber: tp.toothNumber,
                                                      stepName: step.name,
                                                    })}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    <span>Delete subprocedure for this patient</span>
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </div>
                                          </div>

                                          {/* Clinical Note Display */}
                                          {step.notes && (
                                            <div
                                              onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, step.notes)}
                                              className="mt-0.5 flex items-start gap-1.5 px-2 py-1 rounded bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 text-2xs text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-100/70 dark:hover:bg-amber-950/40 transition-colors"
                                              title="Click to edit note"
                                            >
                                              <StickyNote className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                              <span className="italic flex-1 break-words font-normal">{step.notes}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Procedure initiated/linked on this day.</p>
                                )}

                                {/* Earlier steps for this ongoing procedure */}
                                {tp.stepsCompletedEarlier.length > 0 && (
                                  <div className="space-y-1 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-900/40">
                                    <p className="text-2xs font-medium text-muted-foreground">
                                      Earlier milestones completed for this procedure:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {tp.stepsCompletedEarlier.map((step, sIdx) => (
                                        <div
                                          key={sIdx}
                                          className={cn(
                                            "inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-md border transition-colors group text-left",
                                            step.notes
                                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800"
                                              : "bg-muted/70 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground"
                                          )}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => handleTogglePatientSubStep(patient.id, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, true)}
                                            className="text-emerald-600 hover:text-emerald-700 cursor-pointer p-0.5"
                                            title="Click to untick / reopen this step"
                                          >
                                            <Check className="h-3 w-3 shrink-0" />
                                          </button>
                                          <span>{step.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, step.notes)}
                                            title={step.notes ? `Note: ${step.notes} (Click to edit)` : "Click to view or add note"}
                                            className="inline-flex items-center"
                                          >
                                            {step.notes ? (
                                              <StickyNote className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 fill-amber-500/20 shrink-0" />
                                            ) : (
                                              <span className="text-[10px] text-muted-foreground/60 group-hover:text-primary transition-colors">+note</span>
                                            )}
                                          </button>
                                          {step.completedAt && (
                                            <span className="opacity-75 font-mono text-[10px]">({format(new Date(step.completedAt), 'dd MMM')})</span>
                                          )}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors ml-0.5"
                                                title="More options"
                                              >
                                                <MoreVertical className="h-2.5 w-2.5" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="text-xs">
                                              <DropdownMenuItem
                                                className="text-destructive focus:text-destructive text-xs cursor-pointer gap-2"
                                                onClick={() => setSubStepToDelete({
                                                  patientId: patient.id,
                                                  patientName: `${patient.firstName} ${patient.lastName}`,
                                                  procedureId: tp.procedureId,
                                                  procedureName: tp.procedureName,
                                                  toothNumber: tp.toothNumber,
                                                  stepName: step.name,
                                                })}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Delete subprocedure for this patient</span>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Pending steps for this procedure */}
                                {tp.stepsPending.length > 0 && (
                                  <div className="space-y-1 pt-1 border-t border-emerald-200/40 dark:border-emerald-900/20">
                                    <p className="text-2xs font-medium text-muted-foreground">
                                      Remaining steps ({tp.stepsPending.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {tp.stepsPending.map((step, sIdx) => (
                                        <div key={sIdx} className="inline-flex items-center gap-1 rounded bg-muted/40 border border-dashed border-border/60 pr-1.5 pl-1 py-0.5">
                                          <button
                                            type="button"
                                            onClick={() => handleTogglePatientSubStep(patient.id, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, false)}
                                            className="text-muted-foreground hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                                            title="Click to mark this step as completed"
                                          >
                                            <Circle className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                                          </button>
                                          <span className="text-2xs text-muted-foreground/90">{step.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, tp.procedureId, tp.procedureName, tp.toothNumber, step.name, step.notes)}
                                            className={cn(
                                              "inline-flex items-center gap-0.5 text-3xs px-1 py-0.2 rounded transition-colors ml-0.5",
                                              step.notes
                                                ? "text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950 font-medium"
                                                : "text-muted-foreground/60 hover:text-foreground"
                                            )}
                                            title={step.notes ? `Note: ${step.notes}` : "Add note for this step"}
                                          >
                                            <StickyNote className={cn("h-2.5 w-2.5", step.notes ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground/60")} />
                                            {step.notes ? "note" : "+"}
                                          </button>
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <button
                                                type="button"
                                                className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors ml-0.5"
                                                title="More options"
                                              >
                                                <MoreVertical className="h-2.5 w-2.5" />
                                              </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="text-xs">
                                              <DropdownMenuItem
                                                className="text-destructive focus:text-destructive text-xs cursor-pointer gap-2"
                                                onClick={() => setSubStepToDelete({
                                                  patientId: patient.id,
                                                  patientName: `${patient.firstName} ${patient.lastName}`,
                                                  procedureId: tp.procedureId,
                                                  procedureName: tp.procedureName,
                                                  toothNumber: tp.toothNumber,
                                                  stepName: step.name,
                                                })}
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                <span>Delete subprocedure for this patient</span>
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 2. PREVIOUS WORK ON THIS PATIENT (DISTINCTLY MENTIONED) */}
                        <div className="space-y-2.5 pt-2.5 border-t border-border/70">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                              <History className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>Previous Work on Patient</span>
                            </h4>
                            <Badge variant="outline" className="text-3xs font-normal">
                              {previousProcedures.length} prior procedure{previousProcedures.length === 1 ? '' : 's'}
                            </Badge>
                          </div>

                          {previousProcedures.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic pl-5">
                              No previous procedures recorded for this patient before today.
                            </p>
                          ) : (
                            <div className="space-y-2 pl-2 sm:pl-3 border-l-2 border-border/60">
                              {previousProcedures.map((pp, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-border/60 bg-card space-y-1.5">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-xs text-foreground">{pp.procedureName}</span>
                                      {pp.toothNumber && <Badge variant="outline" className="text-3xs px-1.5 py-0">Tooth #{pp.toothNumber}</Badge>}
                                      {pp.date && (
                                        <span className="text-3xs text-muted-foreground">
                                          Initiated: {format(new Date(pp.date), 'dd MMM yyyy')}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-muted-foreground">₹{pp.cost.toLocaleString()}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        title={`Remove ${pp.procedureName} from ${patient.firstName}'s record`}
                                        onClick={() => handleUnlinkProcedureForPatient(patient.id, pp.procedureId, pp.procedureName, pp.toothNumber)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  {pp.stepsCompleted.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-3xs text-muted-foreground font-medium uppercase">Completed Steps:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {pp.stepsCompleted.map((s, sIdx) => (
                                          <div
                                            key={sIdx}
                                            className={cn(
                                              "inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded border transition-colors text-left",
                                              s.notes
                                                ? "bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800"
                                                : "bg-muted/50 border-border/50 text-foreground hover:bg-muted"
                                            )}
                                          >
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePatientSubStep(patient.id, pp.procedureId, pp.procedureName, pp.toothNumber, s.name, true)}
                                              className="text-emerald-600 hover:text-emerald-700 cursor-pointer p-0.5"
                                              title="Click to untick / reopen this step"
                                            >
                                              <Check className="h-3 w-3 shrink-0" />
                                            </button>
                                            <span>{s.name}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, pp.procedureId, pp.procedureName, pp.toothNumber, s.name, s.notes)}
                                              title={s.notes ? `Note: ${s.notes} (Click to edit)` : "Click to view or add note"}
                                              className="inline-flex items-center"
                                            >
                                              {s.notes && <StickyNote className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400 fill-amber-500/20 shrink-0" />}
                                            </button>
                                            {s.completedAt && (
                                              <span className="text-muted-foreground text-[10px]">
                                                ({format(new Date(s.completedAt), 'dd/MM/yyyy')})
                                              </span>
                                            )}
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors ml-0.5"
                                                  title="More options"
                                                >
                                                  <MoreVertical className="h-2.5 w-2.5" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="text-xs">
                                                <DropdownMenuItem
                                                  className="text-destructive focus:text-destructive text-xs cursor-pointer gap-2"
                                                  onClick={() => setSubStepToDelete({
                                                    patientId: patient.id,
                                                    patientName: `${patient.firstName} ${patient.lastName}`,
                                                    procedureId: pp.procedureId,
                                                    procedureName: pp.procedureName,
                                                    toothNumber: pp.toothNumber,
                                                    stepName: s.name,
                                                  })}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                  <span>Delete subprocedure for this patient</span>
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {pp.stepsPending.length > 0 && (
                                    <div className="space-y-1 pt-1 border-t border-border/40">
                                      <p className="text-3xs text-muted-foreground font-medium uppercase">Remaining Steps:</p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {pp.stepsPending.map((s, sIdx) => (
                                          <div key={sIdx} className="inline-flex items-center gap-1 rounded bg-muted/40 border border-dashed border-border/60 pr-1.5 pl-1 py-0.5">
                                            <button
                                              type="button"
                                              onClick={() => handleTogglePatientSubStep(patient.id, pp.procedureId, pp.procedureName, pp.toothNumber, s.name, false)}
                                              className="text-muted-foreground hover:text-emerald-600 transition-colors p-0.5 cursor-pointer"
                                              title="Click to mark this step as completed"
                                            >
                                              <Circle className="h-2.5 w-2.5 opacity-60 hover:opacity-100" />
                                            </button>
                                            <span className="text-2xs text-muted-foreground/90">{s.name}</span>
                                            <button
                                              type="button"
                                              onClick={() => handleOpenNoteDialog(patient.id, `${patient.firstName} ${patient.lastName}`, pp.procedureId, pp.procedureName, pp.toothNumber, s.name, s.notes)}
                                              className={cn(
                                                "inline-flex items-center gap-0.5 text-3xs px-1 py-0.2 rounded transition-colors ml-0.5",
                                                s.notes
                                                  ? "text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950 font-medium"
                                                  : "text-muted-foreground/60 hover:text-foreground"
                                              )}
                                              title={s.notes ? `Note: ${s.notes}` : "Add note for this step"}
                                            >
                                              <StickyNote className={cn("h-2.5 w-2.5", s.notes ? "text-amber-500 fill-amber-500/20" : "text-muted-foreground/60")} />
                                              {s.notes ? "note" : "+"}
                                            </button>
                                            <DropdownMenu>
                                              <DropdownMenuTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors ml-0.5"
                                                  title="More options"
                                                >
                                                  <MoreVertical className="h-2.5 w-2.5" />
                                                </button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end" className="text-xs">
                                                <DropdownMenuItem
                                                  className="text-destructive focus:text-destructive text-xs cursor-pointer gap-2"
                                                  onClick={() => setSubStepToDelete({
                                                    patientId: patient.id,
                                                    patientName: `${patient.firstName} ${patient.lastName}`,
                                                    procedureId: pp.procedureId,
                                                    procedureName: pp.procedureName,
                                                    toothNumber: pp.toothNumber,
                                                    stepName: s.name,
                                                  })}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                  <span>Delete subprocedure for this patient</span>
                                                </DropdownMenuItem>
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 3. PATIENT FINANCIALS AT THE BOTTOM (BILLABLE, PAID, AND DUE) */}
                        <div className="space-y-2 pt-2.5 border-t border-border/70">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                            <Wallet className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span>Patient Financials</span>
                          </h4>
                          <PatientBillingSummary
                            patientId={patient.id}
                            patients={patients}
                            allProcedures={procedures}
                            transactions={transactions}
                            clinicId={clinicId}
                            className="bg-card border border-border/70 shadow-xs mt-2"
                          />
                        </div>

                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: PROCEDURES LIST / CATALOGUE */}
        {/* ========================================================================= */}
        <TabsContent value="catalogue" className="mt-4 space-y-4">
          <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
            <CardContent className="px-0 sm:px-6 pt-1 sm:pt-6 space-y-3 sm:space-y-4">
              <div className="relative no-print">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search procedures by name, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 sm:pl-10 h-9 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              {renderContent()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
