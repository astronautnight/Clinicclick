
'use client';

import { useState, type FormEvent, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Doctor } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Trash2, Loader2, ServerCrash, Edit, Stethoscope } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger as AlertDialogTriggerCustom } from "@/components/ui/alert-dialog";
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { addDoctor, deleteDoctor, updateDoctor } from '@/services/doctor-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from "@/components/ui/alert";

const PALETTE = [
  "#001219",
  "#005f73",
  "#0a9396",
  "#94d2bd",
  "#e9d8a6",
  "#ee9b00",
  "#ca6702",
  "#bb3e03",
  "#ae2012",
  "#9b2226"
];

const colorNames = [
  "Ink",
  "Deep Teal",
  "Teal",
  "Mint",
  "Sand",
  "Amber",
  "Copper",
  "Burnt Orange",
  "Crimson",
  "Brick"
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
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Ensure color exists: use chosen or auto-assign unique one
      let chosenColor = formData.color;
      if (!chosenColor) {
        chosenColor = getNextAvailableColor(doctors);
      }

      const payload: any = {
        name: formData.name,
        specialization: formData.specialization,
        registrationNumber: formData.registrationNumber || '',
        contactNumber: formData.contactNumber || '',
        email: formData.email || '',
        description: formData.description || '',
        color: chosenColor,
      };

      if (editingDoctorId) {
        await updateDoctor(clinicId, editingDoctorId, payload);
        toast({ title: "Doctor Updated", description: `${formData.name} has been updated.` });
      } else {
        await addDoctor(clinicId, payload);
        toast({ title: "Doctor Added", description: `${formData.name} has been added.` });
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
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      registrationNumber: doctor.registrationNumber || '',
      contactNumber: doctor.contactNumber || '',
      email: doctor.email || '',
      description: doctor.description || '',
      color: (doctor as any).color || undefined,
    });
    setIsFormOpen(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">Loading doctors...</p>
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
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No doctors added yet. Click "Add New Doctor" to get started.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {doctors.map(doctor => {
          const color: string = (doctor as any).color || getNextAvailableColor(doctors);
          const bg = hexToRgba(color, 0.10); // subtle tint
          const border = hexToRgba(color, 0.22); // slightly stronger
          const accentText = hexToRgba(color, 0.9);

          return (
            <Card key={doctor.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow" style={{ background: bg, border: `1px solid ${border}` }}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      <span style={{ width: 12, height: 12, borderRadius: 6, background: color, display: 'inline-block', boxShadow: `0 0 8px ${hexToRgba(color, 0.18)}` }} />
                      <span style={{ color: accentText }}>{doctor.name}</span>
                    </CardTitle>
                    <CardDescription className="text-sm" style={{ color: hexToRgba(color, 0.75) }}>{doctor.specialization}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-2 text-sm">
                {doctor.description && <p className="text-muted-foreground italic">"{doctor.description}"</p>}
                {doctor.registrationNumber && <p><strong>Reg. No:</strong> {doctor.registrationNumber}</p>}
                <p><strong>Contact:</strong> {doctor.contactNumber || 'N/A'}</p>
                <p><strong>Email:</strong> {doctor.email || 'N/A'}</p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-4 border-t mt-auto">
                <Button variant="outline" size="sm" onClick={() => openEditForm(doctor)}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTriggerCustom asChild>
                    <Button variant="destructive" size="sm" onClick={() => setDoctorToDelete(doctor)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </AlertDialogTriggerCustom>
                  <AlertDialogContent>
                    <AlertDialogHeaderCustom>
                      <AlertDialogTitleCustom>Are you sure?</AlertDialogTitleCustom>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete Dr. {doctorToDelete?.name}.
                      </AlertDialogDescription>
                    </AlertDialogHeaderCustom>
                    <AlertDialogFooterCustom>
                      <AlertDialogCancel onClick={() => setDoctorToDelete(null)}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteDoctor}>Delete</AlertDialogAction>
                    </AlertDialogFooterCustom>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    );
  };

  // build colour dropdown options (name + swatch)
  const colorOptions = useMemo(() => PALETTE.map((hex, i) => ({ hex, name: colorNames[i] || `Color ${i + 1}` })), []);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Stethoscope className="mr-3 h-8 w-8 text-special4" />
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
            <Button onClick={openAddForm} disabled={!user || !clinicId}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Doctor
            </Button>
          </DialogTrigger>

          {/* DialogContent: keep dialog chrome fixed; inner body scrolls */}
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingDoctorId ? 'Edit Doctor' : 'Add New Doctor'}</DialogTitle>
              <CardDescription>Enter the details for the doctor.</CardDescription>
            </DialogHeader>

            <form onSubmit={handleFormSubmit}>
              {/* scrollable area inside modal */}
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <Label htmlFor="name">Doctor Name</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Dr. Jane Doe" required disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input id="specialization" name="specialization" value={formData.specialization} onChange={handleInputChange} placeholder="e.g., General Dentistry" required disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="registrationNumber">Registration Number (Optional)</Label>
                  <Input id="registrationNumber" name="registrationNumber" value={formData.registrationNumber || ''} onChange={handleInputChange} placeholder="e.g., A-12345" disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea id="description" name="description" value={formData.description || ''} onChange={handleInputChange} placeholder="e.g., Bio, office hours, etc." disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="contactNumber">Contact Number (Optional)</Label>
                  <Input id="contactNumber" name="contactNumber" value={formData.contactNumber || ''} onChange={handleInputChange} placeholder="e.g., 555-1234" disabled={isSubmitting} />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleInputChange} placeholder="e.g., jane.doe@clinic.com" disabled={isSubmitting} />
                </div>

                <div>
                  <Label>Card Colour (Optional)</Label>
                  <div className="flex items-center gap-3 flex-wrap mt-2">
                    {/* swatch preview & select */}
                    <div className="flex gap-2 items-center">
                      <select
                        aria-label="Choose doctor colour"
                        className="rounded-md border px-3 py-2"
                        value={formData.color || ''}
                        onChange={(e) => handleColorChange(e.target.value)}
                        disabled={isSubmitting}
                      >
                        <option value="">Auto assign (unique)</option>
                        {colorOptions.map((c) => (
                          <option key={c.hex} value={c.hex}>
                            {c.name} — {c.hex}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* visual swatches */}
                    <div className="flex gap-2 items-center">
                      {colorOptions.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          title={`${c.name} ${c.hex}`}
                          onClick={() => handleColorChange(c.hex)}
                          className={`w-8 h-8 rounded-md border-2 ${formData.color === c.hex ? 'ring-2 ring-offset-1' : ''}`}
                          style={{ background: hexToRgba(c.hex, 0.20), borderColor: c.hex }}
                        />
                      ))}
                      <div className="text-xs text-muted-foreground ml-2">Click swatch to pick</div>
                    </div>
                  </div>
                </div>

              </div>

              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (editingDoctorId ? 'Save Changes' : 'Add Doctor')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {renderContent()}
    </div>
  );
}

    
