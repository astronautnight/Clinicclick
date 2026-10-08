'use client';

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Doctor } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Loader2, ServerCrash, Edit, Stethoscope, Search, Phone, Mail, FileText, Sparkles, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger as AlertDialogTriggerCustom } from "@/components/ui/alert-dialog";
import { useUser, useFirestore } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import { collection, onSnapshot } from 'firebase/firestore';
import { addDoctor, deleteDoctor, updateDoctor } from '@/services/doctor-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const PALETTE = [
  "#1E3A8A",
  "#7C3AED",
  "#EC4899",
  "#F59E0B",
  "#14B8A6",
  "#DC2626",
  "#4F46E5",
  "#84CC16",
  "#0EA5E9",
  "#475569"
];

const colorNames = [
  "Deep Blue",
  "Vibrant Purple",
  "Soft Pink",
  "Amber",
  "Teal",
  "Crimson",
  "Indigo",
  "Lime Green",
  "Sky Blue",
  "Slate"
];

const initialDoctorData: Omit<Doctor, 'id' | 'assignedPatients' | 'assignedProcedures' | 'createdAt' | 'updatedAt' | 'color'> & { color?: string } = {
  name: '',
  specialization: '',
  registrationNumber: '',
  contactNumber: '',
  email: '',
  description: '',
  color: undefined,
};

function hexToRgba(hex: string, alpha = 1) {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function DoctorsPage() {
  const { user, clinicId, loading, clinicLoading } = useUser();
  const noClinic = user && !clinicId && !loading && !clinicLoading;

  const db = useFirestore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [doctorToDelete, setDoctorToDelete] = useState<Doctor | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialDoctorData);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (!user || !db || !clinicId) {
      setIsLoading(false);
      return;
    }

    const doctorsColRef = collection(db, "clinics", clinicId, "doctors");

    const unsubscribe = onSnapshot(
      doctorsColRef,
      (snapshot) => {
        const fetchedDoctors: Doctor[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Doctor));
        setDoctors(fetchedDoctors);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        const permissionError = new FirestorePermissionError({
          path: doctorsColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        console.error("Firestore Error on doctors snapshot:", err);
        setError("Failed to fetch doctors. Check permissions.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, db, clinicId]);

  // Determine next available color (first unused)
  const getNextAvailableColor = (existing: Doctor[]) => {
    const used = new Set(existing.map(d => (d as any).color).filter(Boolean));
    const available = PALETTE.find(c => !used.has(c));
    return available || PALETTE[Math.floor(Math.random() * PALETTE.length)];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorChange = (color: string) => {
    setFormData(prev => ({ ...prev, color }));
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db || !clinicId) {
      toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
      return;
    }
    if (!formData.name || !formData.specialization) {
      toast({ title: "Error", description: "Doctor name and specialization are required.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let chosenColor = formData.color;
      if (!chosenColor) {
        chosenColor = getNextAvailableColor(doctors);
      }

      let finalName = formData.name.trim();
      if (!finalName.startsWith("Dr. ")) {
        finalName = `Dr. ${finalName}`;
      }

      const payload: any = {
        name: finalName,
        specialization: formData.specialization,
        registrationNumber: formData.registrationNumber || '',
        contactNumber: formData.contactNumber || '',
        email: formData.email || '',
        description: formData.description || '',
        color: chosenColor,
      };

      if (editingDoctorId) {
        await updateDoctor(clinicId, editingDoctorId, payload);
        toast({ title: "Doctor Updated", description: `${finalName} has been updated.` });
      } else {
        await addDoctor(clinicId, payload);
        toast({ title: "Doctor Added", description: `${finalName} has been added.` });
      }

      setFormData(initialDoctorData);
      setIsFormOpen(false);
      setEditingDoctorId(null);
    } catch (err: any) {
      console.error("Error saving doctor:", err);
      toast({ title: "Error Saving Doctor", description: err.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (doctorToDelete && user && db && clinicId) {
      try {
        await deleteDoctor(clinicId, doctorToDelete.id);
        toast({ title: "Doctor Deleted", description: `${doctorToDelete.name} has been removed.`, variant: "default" });
        setDoctorToDelete(null);
      } catch (err: any) {
        console.error("Error deleting doctor:", err);
        toast({ title: "Error", description: "Could not delete doctor.", variant: "destructive" });
      }
    }
  };

  const openAddForm = () => {
    setEditingDoctorId(null);
    setFormData(initialDoctorData);
    setIsFormOpen(true);
  };

  const openEditForm = (doctor: Doctor) => {
    setEditingDoctorId(doctor.id);
    let displayNameWithoutDr = doctor.name || '';
    if (displayNameWithoutDr.startsWith("Dr. ")) {
      displayNameWithoutDr = displayNameWithoutDr.substring(4);
    }
    setFormData({
      name: displayNameWithoutDr,
      specialization: doctor.specialization,
      registrationNumber: doctor.registrationNumber || '',
      contactNumber: doctor.contactNumber || '',
      email: doctor.email || '',
      description: doctor.description || '',
      color: (doctor as any).color || undefined,
    });
    setIsFormOpen(true);
  };

  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors;
    const q = searchQuery.toLowerCase();
    return doctors.filter(doc => 
      doc.name.toLowerCase().includes(q) ||
      doc.specialization.toLowerCase().includes(q) ||
      (doc.registrationNumber && doc.registrationNumber.toLowerCase().includes(q)) ||
      (doc.contactNumber && doc.contactNumber.toLowerCase().includes(q)) ||
      (doc.email && doc.email.toLowerCase().includes(q))
    );
  }, [doctors, searchQuery]);

  const colorOptions = useMemo(() => PALETTE.map((hex, i) => ({ hex, name: colorNames[i] || `Color ${i + 1}` })), []);

  const renderContent = () => {
    if (noClinic) return <ClinicSetupAlert sectionName="Doctors" />;
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="ml-3 text-sm text-muted-foreground">Loading doctors...</p>
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

    if (doctors.length === 0) {
      return (
        <Card className="rounded-xl border border-dashed border-border/80">
          <CardContent className="p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-special4/10 text-special4">
              <Stethoscope className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No doctors added yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add medical specialists to assign them to appointments and procedures.
            </p>
            <Button size="sm" onClick={openAddForm} disabled={!user || !clinicId} className="h-8 text-xs">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add First Doctor
            </Button>
          </CardContent>
        </Card>
      );
    }

    if (filteredDoctors.length === 0) {
      return (
        <div className="text-center py-10 rounded-xl border border-dashed border-border/80 bg-muted/20">
          <p className="text-sm font-medium text-muted-foreground">No doctors match your search "{searchQuery}"</p>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="mt-2 text-xs">
            Clear Search
          </Button>
        </div>
      );
    }

    return (
      <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDoctors.map(doctor => {
          const color: string = (doctor as any).color || getNextAvailableColor(doctors);
          const bg = hexToRgba(color, 0.07);
          const border = hexToRgba(color, 0.25);
          const accentText = hexToRgba(color, 0.95);

          return (
            <div
              key={doctor.id}
              className="rounded-xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden bg-card"
              style={{ background: bg, borderColor: border }}
            >
              {/* Level 1: Doctor Header / Main Info */}
              <div className="p-3.5 sm:p-4 pb-3">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-background"
                      style={{ background: color, boxShadow: `0 0 10px ${hexToRgba(color, 0.4)}` }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base leading-tight truncate" style={{ color: accentText }}>
                        {doctor.name}
                      </h3>
                      <p className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                        {doctor.specialization}
                      </p>
                    </div>
                  </div>
                  {doctor.registrationNumber && (
                    <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0 h-5 font-mono bg-background/60">
                      {doctor.registrationNumber}
                    </Badge>
                  )}
                </div>

                {/* Level 2: Nested Doctor Details Container */}
                <div className="mt-3 rounded-lg bg-background/70 border border-border/60 p-2.5 sm:p-3 space-y-1.5 text-xs text-foreground/90">
                  {doctor.description && (
                    <p className="text-[11px] sm:text-xs text-muted-foreground italic line-clamp-2 pb-1 border-b border-border/40">
                      "{doctor.description}"
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="truncate">{doctor.contactNumber || 'No phone number'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0 text-primary/70" />
                    <span className="truncate">{doctor.email || 'No email address'}</span>
                  </div>
                </div>
              </div>

              {/* Level 3: Action Buttons Bar */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-background/50 border-t border-border/50 flex items-center justify-end gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs hover:bg-background" onClick={() => openEditForm(doctor)}>
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTriggerCustom asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDoctorToDelete(doctor)}>
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTriggerCustom>
                  <AlertDialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-md rounded-2xl sm:rounded-xl p-4 sm:p-6">
                    <AlertDialogHeaderCustom>
                      <AlertDialogTitleCustom className="text-base sm:text-lg">Delete Doctor?</AlertDialogTitleCustom>
                      <AlertDialogDescription className="text-xs sm:text-sm">
                        This action cannot be undone. This will permanently remove {doctorToDelete?.name} from your clinic records.
                      </AlertDialogDescription>
                    </AlertDialogHeaderCustom>
                    <AlertDialogFooterCustom className="gap-2 sm:gap-0 mt-3 sm:mt-4">
                      <AlertDialogCancel onClick={() => setDoctorToDelete(null)} className="h-8 text-xs sm:h-9 sm:text-sm">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteDoctor} className="h-8 text-xs sm:h-9 sm:text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooterCustom>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
          <Stethoscope className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-special4" />
          Doctor Management
        </h1>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingDoctorId(null);
            setFormData(initialDoctorData);
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={openAddForm} disabled={!user || !clinicId} className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4">
              <PlusCircle className="mr-1.5 sm:mr-2 h-4 w-4" /> Add New Doctor
            </Button>
          </DialogTrigger>

          {/* Compact Modal adhering strictly to safe mobile viewport bounds */}
          <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-xl max-h-[92vh] rounded-2xl sm:rounded-xl p-3.5 sm:p-6 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
            <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-special4" />
                {editingDoctorId ? 'Edit Doctor' : 'Add New Doctor'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter specialist details, contact information, and card styling.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-3 sm:py-4 space-y-3 sm:space-y-3.5">
                <div>
                  <Label htmlFor="name" className="text-xs sm:text-sm font-medium">Doctor Name *</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs sm:text-sm font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 border rounded-md select-none shrink-0 h-8 sm:h-9 flex items-center">Dr.</span>
                    <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Jane Doe" required disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specialization" className="text-xs sm:text-sm font-medium">Specialization *</Label>
                  <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g., General Dentistry, Orthodontics" required disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <Label htmlFor="contactNumber" className="text-xs sm:text-sm font-medium">Contact Number</Label>
                    <Input id="contactNumber" name="contactNumber" value={formData.contactNumber || ''} onChange={handleInputChange} placeholder="e.g., 555-0199" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="registrationNumber" className="text-xs sm:text-sm font-medium">Registration Number</Label>
                    <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber || ''} onChange={handleInputChange} placeholder="e.g., MED-12345" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email Address</Label>
                  <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} placeholder="e.g., doctor@clinic.com" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Description / Bio</Label>
                  <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="Brief bio, availability or notes..." disabled={isSubmitting} className="min-h-[60px] text-xs sm:text-sm mt-1" />
                </div>

                {/* Color Scheme Picker */}
                <div className="pt-1">
                  <Label className="text-xs sm:text-sm font-medium">Card Color Theme</Label>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {colorOptions.map(c => (
                      <button
                        key={c.hex}
                        type="button"
                        title={`${c.name} (${c.hex})`}
                        onClick={() => handleColorChange(c.hex)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-transform hover:scale-105 flex items-center justify-center ${formData.color === c.hex ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'border-transparent'}`}
                        style={{ background: hexToRgba(c.hex, 0.25), borderColor: c.hex }}
                      >
                        {formData.color === c.hex && (
                          <div className="w-2 h-2 rounded-full" style={{ background: c.hex }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter className="px-1 pt-3 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting} className="h-8 sm:h-9 text-xs sm:text-sm">
                  {isSubmitting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : (editingDoctorId ? 'Save Changes' : 'Add Doctor')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Direct Search Bar (No redundant banners) */}
      {doctors.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search doctors by name, specialization, phone, reg no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 sm:h-10 text-xs sm:text-sm bg-card border-border/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {renderContent()}
    </div>
  );
}
