

'use client';

import { useState, type FormEvent, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Procedure, ProcedureCategory, Patient, LinkedProcedure } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ListPlus, Link2, ClipboardList, Trash2, FilePenLine, Loader2, ServerCrash, Video, PlusCircle, X, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useFirestore, useUser } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { addProcedure, deleteProcedure, updateProcedure as updateProcedureService, seedInitialProcedures } from '@/services/procedure-service';
import { updatePatient } from '@/services/patient-service';
import { getUserProfile } from '@/services/auth-service';
import { MASTER_PROCEDURE_PRESET } from '@/lib/procedure-presets';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

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


export default function ProceduresPage() {
  const { user, clinicId, loading, clinicLoading } = useUser();
  const noClinic = user && !clinicId && !loading && !clinicLoading;
  const db = useFirestore();
  const { toast } = useToast();

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProcedure, setNewProcedure] = useState(initialProcedureFormData);
  const [newProcedureMaterials, setNewProcedureMaterials] = useState<string[]>([]);

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
             setProcedures(fetchedProcedures.sort((a, b) => a.category && b.category && a.category !== b.category ? a.category.localeCompare(b.category) : a.name.localeCompare(b.name)));
            setError(null);
            setIsLoading(false);
        }
    }, (err) => {
        const permissionError = new FirestorePermissionError({ path: proceduresColRef.path, operation: 'list' });
        errorEmitter.emit('permission-error', permissionError);
        setError("Failed to fetch procedures. Check permissions.");
        setIsLoading(false);
    });

    return () => { unsubProcedures(); unsubPatients(); };
  }, [db, user, clinicId, toast]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProcedure(prev => ({ ...prev, [name]: name === 'cost' || name === 'durationMinutes' ? parseFloat(value) || 0 : value }));
  }, []);

  const handleSelectChange = useCallback((value: ProcedureCategory) => setNewProcedure(prev => ({ ...prev, category: value })), []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!db || !user || !clinicId) {
      toast({ title: "Error", description: "Database or user not available.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await addProcedure(clinicId, { ...newProcedure, materials: newProcedureMaterials });
      toast({ title: "Procedure Added", description: `${newProcedure.name} has been added.` });
      setNewProcedure(initialProcedureFormData);
      setNewProcedureMaterials([]);
      setIsAddFormOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: "Could not add procedure.", variant: "destructive" });
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
      await updateProcedureService(clinicId, editingProcedure.id, { ...editedProcedureData, materials: editedProcedureMaterials });
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
  }

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
    <div className="space-y-4 sm:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
          <ClipboardList className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-special3" />
          Procedure Management
        </h1>
        <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => { setNewProcedure(initialProcedureFormData); setNewProcedureMaterials([]); setIsAddFormOpen(true); }}
              disabled={!user || !clinicId}
              className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
            >
              <ListPlus className="mr-1.5 sm:mr-2 h-4 w-4" />
              <span className="sm:hidden">Add Procedure</span>
              <span className="hidden sm:inline">Add New Procedure</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-xl max-h-[92vh] rounded-2xl sm:rounded-xl p-3 sm:p-6 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
            <DialogHeader className="px-1 pt-0.5 pb-2.5 sm:pb-4 border-b shrink-0">
              <DialogTitle className="text-base sm:text-xl font-bold">Add New Dental Procedure</DialogTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">Define a new procedure and its required materials.</CardDescription>
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
                <div className="border-t border-border/60 pt-3">{renderMaterialsFields(newProcedureMaterials, setNewProcedureMaterials, isSubmitting)}</div>
              </div>
              <DialogFooter className="px-1 pt-2.5 pb-0.5 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
                <DialogClose asChild><Button type="button" variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></DialogClose>
                <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Adding...</> : 'Add Procedure'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                <div className="border-t border-border/60 pt-3">{renderMaterialsFields(editedProcedureMaterials, setEditedProcedureMaterials, isSubmitting)}</div>
            </div>
            <DialogFooter className="px-1 pt-2.5 pb-0.5 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
              <DialogClose asChild><Button type="button" variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></DialogClose>
              <Button type="submit" size="sm" className="h-8 text-xs" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</> : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
