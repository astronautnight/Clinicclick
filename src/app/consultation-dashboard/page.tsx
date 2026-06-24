
'use client';
import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Patient, Appointment, Transaction, Doctor, Procedure } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { UsersRound, MapPin, PlusCircle, Edit3, Info, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addPatient, updatePatient } from '@/services/patient-service';
import { addAppointment, updateAppointment } from '@/services/appointment-service';
import {
  addPersonalConsultPatient,
  updatePersonalConsultPatient,
  addPersonalConsultAppointment,
  updatePersonalConsultAppointment,
  getPersonalConsultCol,
} from '@/services/personal-consultation-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const initialPatientData: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'photos' | 'videos' | 'linkedProcedures' | 'markedTeeth' | 'stagedObservations'> = {
  firstName: "", lastName: "", dateOfBirth: "", gender: "Other", contactNumber: "", isConsult: true,
};

const initialAppointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patientName' | 'doctorName'> = {
  patientId: "", doctorId: "", date: new Date().toISOString().split('T')[0], startTime: "10:00", endTime: "10:30",
  procedureIds: [], notes: "", status: "Scheduled", isConsult: true, consultLocation: "",
};

/* ─────────────────────────────────────────────────────────────────────── */
/* Shared mini-table components                                            */
/* ─────────────────────────────────────────────────────────────────────── */

function PatientTable({ patients, onEdit }: { patients: Patient[]; onEdit: (p: Patient) => void }) {
  if (patients.length === 0) return <p className="text-center p-6 text-muted-foreground">No patients found.</p>;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {patients.map(p => (
          <TableRow key={p.id}>
            <TableCell>{p.firstName} {p.lastName}</TableCell>
            <TableCell>{p.contactNumber}</TableCell>
            <TableCell className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{p.consultLocation || 'N/A'}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEdit(p)}><Edit3 className="h-4 w-4" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function AppointmentTable({ appointments, onEdit }: { appointments: Appointment[]; onEdit: (a: Appointment) => void }) {
  if (appointments.length === 0) return <p className="text-center p-6 text-muted-foreground">No appointments found.</p>;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {[...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
          <TableRow key={a.id}>
            <TableCell>{format(new Date(a.date), 'dd/MM/yyyy')}</TableCell>
            <TableCell>{a.startTime}</TableCell>
            <TableCell>{a.patientName}</TableCell>
            <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
            <TableCell className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{a.consultLocation || 'N/A'}</TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" onClick={() => onEdit(a)}><Edit3 className="h-4 w-4" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */
/* Main page                                                               */
/* ─────────────────────────────────────────────────────────────────────── */

export default function ConsultationDashboardPage() {
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const isPersonalMode = !clinicId; // no clinic → personal-only mode

  /* ── Clinic data (only populated when clinicId exists) ── */
  const [clinicPatients, setClinicPatients] = useState<Patient[]>([]);
  const [clinicAppointments, setClinicAppointments] = useState<Appointment[]>([]);
  const [clinicTransactions, setClinicTransactions] = useState<Transaction[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  /* ── Personal data (ALWAYS populated, regardless of clinic membership) ── */
  const [personalPatients, setPersonalPatients] = useState<Patient[]>([]);
  const [personalAppointments, setPersonalAppointments] = useState<Appointment[]>([]);

  const [loading, setLoading] = useState(true);

  /* ── Form / dialog state ── */
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  // 'clinic' | 'personal' — which store the form targets
  const [formTarget, setFormTarget] = useState<'clinic' | 'personal'>('personal');
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientFormData, setPatientFormData] = useState(initialPatientData);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentFormData, setAppointmentFormData] = useState(initialAppointmentData);

  /* ─────────────────────────────────────────────────────────────────── */
  /* Data subscriptions                                                   */
  /* ─────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!user || !db) { setLoading(false); return; }

    const uid = user.uid;
    const unsubs: (() => void)[] = [];

    // ── 1. Always subscribe to PERSONAL data ──
    unsubs.push(
      onSnapshot(getPersonalConsultCol(uid, 'patients'), snap => {
        setPersonalPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
        setLoading(false);
      }),
      onSnapshot(getPersonalConsultCol(uid, 'appointments'), snap => {
        setPersonalAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      }),
    );

    // ── 2. Also subscribe to CLINIC data (only when user belongs to one) ──
    if (clinicId) {
      unsubs.push(
        onSnapshot(query(collection(db, 'clinics', clinicId, 'patients')), snap => {
          setClinicPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
        }),
        onSnapshot(query(collection(db, 'clinics', clinicId, 'appointments')), snap => {
          setClinicAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
        }),
        onSnapshot(
          query(collection(db, 'clinics', clinicId, 'transactions'), where('isConsult', '==', true)),
          snap => { setClinicTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))); }
        ),
        onSnapshot(collection(db, 'clinics', clinicId, 'doctors'), snap => {
          setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
        }),
      );
      setLoading(false);
    }

    return () => unsubs.forEach(u => u());
  }, [user, db, clinicId]);

  /* ─────────────────────────────────────────────────────────────────── */
  /* Derived data                                                         */
  /* ─────────────────────────────────────────────────────────────────── */
  const consultClinicPatients = useMemo(() => clinicPatients.filter(p => p.isConsult), [clinicPatients]);
  const consultClinicAppointments = useMemo(() => clinicAppointments.filter(a => a.isConsult), [clinicAppointments]);
  const totalConsultRevenue = useMemo(() =>
    clinicTransactions.filter(t => t.type === 'Earning').reduce((acc, t) => acc + t.amount, 0),
    [clinicTransactions]);

  /* ─────────────────────────────────────────────────────────────────── */
  /* Form handlers                                                        */
  /* ─────────────────────────────────────────────────────────────────── */
  const handleOpenPatientForm = (patient: Patient | null, target: 'clinic' | 'personal') => {
    setFormTarget(target);
    if (patient) {
      setEditingPatientId(patient.id);
      setPatientFormData({ ...initialPatientData, ...patient, isConsult: true });
    } else {
      setEditingPatientId(null);
      setPatientFormData(initialPatientData);
    }
    setIsPatientFormOpen(true);
  };

  const handlePatientSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (formTarget === 'personal') {
        if (editingPatientId) {
          await updatePersonalConsultPatient(user.uid, editingPatientId, patientFormData);
        } else {
          await addPersonalConsultPatient(user.uid, { ...patientFormData, isConsult: true });
        }
        toast({ title: editingPatientId ? "Personal Patient Updated" : "Personal Patient Added" });
      } else {
        if (editingPatientId) {
          await updatePatient(clinicId!, editingPatientId, patientFormData);
        } else {
          await addPatient(clinicId!, { ...patientFormData, isConsult: true });
        }
        toast({ title: editingPatientId ? "Clinic Patient Updated" : "Clinic Patient Added" });
      }
      setIsPatientFormOpen(false);
    } catch {
      toast({ title: "Error", description: "Could not save patient.", variant: "destructive" });
    }
  };

  const handleOpenAppointmentForm = (appointment: Appointment | null, target: 'clinic' | 'personal') => {
    setFormTarget(target);
    if (appointment) {
      setEditingAppointmentId(appointment.id);
      setAppointmentFormData({
        patientId: appointment.patientId,
        doctorId: appointment.doctorId || "",
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        procedureIds: appointment.procedureIds || [],
        notes: appointment.notes || "",
        status: appointment.status,
        isConsult: true,
        consultLocation: appointment.consultLocation || "",
      });
    } else {
      setEditingAppointmentId(null);
      setAppointmentFormData(initialAppointmentData);
    }
    setIsAppointmentFormOpen(true);
  };

  const handleAppointmentSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const patientList = formTarget === 'personal' ? personalPatients : consultClinicPatients;
    const patient = patientList.find(p => p.id === appointmentFormData.patientId);
    const doctor = doctors.find(d => d.id === appointmentFormData.doctorId);

    const payload = {
      ...appointmentFormData,
      isConsult: true,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'N/A',
      doctorName: doctor ? doctor.name : 'N/A',
    };

    try {
      if (formTarget === 'personal') {
        if (editingAppointmentId) {
          await updatePersonalConsultAppointment(user.uid, editingAppointmentId, payload);
        } else {
          await addPersonalConsultAppointment(user.uid, payload);
        }
        toast({ title: editingAppointmentId ? "Personal Appointment Updated" : "Personal Appointment Scheduled" });
      } else {
        if (editingAppointmentId) {
          await updateAppointment(clinicId!, editingAppointmentId, payload);
        } else {
          await addAppointment(clinicId!, payload);
        }
        toast({ title: editingAppointmentId ? "Clinic Appointment Updated" : "Clinic Appointment Scheduled" });
      }
      setIsAppointmentFormOpen(false);
    } catch {
      toast({ title: "Error", description: "Could not save appointment.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading consultation data…</div>;
  }

  /* ─────────────────────────────────────────────────────────────────── */
  /* Render                                                               */
  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <UsersRound className="mr-3 h-8 w-8 text-accent" />
          Consultation Dashboard
        </h1>
        {/* Always show the lock badge — personal data is always safe */}
        <div className="flex items-start gap-2 rounded-lg border border-pink-200 bg-pink-50 dark:border-pink-800/60 dark:bg-pink-950/30 px-4 py-3 text-sm text-pink-700 dark:text-pink-300 max-w-sm">
          <Lock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Your personal records are always private</strong> — they are never shared with or overridden by any clinic.
          </span>
        </div>
      </div>

      <Tabs defaultValue={isPersonalMode ? "personal-patients" : "clinic-patients"} className="w-full">
        <div className="overflow-x-auto pb-1 -mx-1 px-1">
          <TabsList className="w-max flex-nowrap gap-1">
            {/* ── Clinic tabs (only shown when user has a clinic) ── */}
            {!isPersonalMode && <>
              <TabsTrigger value="clinic-patients">Clinic Patients ({consultClinicPatients.length})</TabsTrigger>
              <TabsTrigger value="clinic-appointments">Clinic Appointments ({consultClinicAppointments.length})</TabsTrigger>
              <TabsTrigger value="clinic-financials">Clinic Financials</TabsTrigger>
              <div className="w-px h-5 bg-border mx-1 self-center" />
            </>}
            {/* ── Personal tabs (always shown) ── */}
            <TabsTrigger value="personal-patients" className="data-[state=active]:border-pink-400 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400">
              🔒 My Patients ({personalPatients.length})
            </TabsTrigger>
            <TabsTrigger value="personal-appointments" className="data-[state=active]:border-pink-400 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400">
              🔒 My Appointments ({personalAppointments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── CLINIC TABS ── */}
        {!isPersonalMode && <>
          <TabsContent value="clinic-patients" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Clinic Consultation Patients</CardTitle>
                  <Button onClick={() => handleOpenPatientForm(null, 'clinic')}><PlusCircle className="mr-2 h-4 w-4" /> Add Patient</Button>
                </div>
              </CardHeader>
              <CardContent>
                <PatientTable patients={consultClinicPatients} onEdit={p => handleOpenPatientForm(p, 'clinic')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinic-appointments" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Clinic Consultation Appointments</CardTitle>
                  <Button onClick={() => handleOpenAppointmentForm(null, 'clinic')}><PlusCircle className="mr-2 h-4 w-4" /> Add Appointment</Button>
                </div>
              </CardHeader>
              <CardContent>
                <AppointmentTable appointments={consultClinicAppointments} onEdit={a => handleOpenAppointmentForm(a, 'clinic')} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clinic-financials" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinic Consultation Financials</CardTitle>
                <CardDescription>Total revenue: <span className="font-bold text-primary">₹{totalConsultRevenue.toLocaleString()}</span></CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {clinicTransactions.filter(t => t.type === 'Earning').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                      const patient = consultClinicPatients.find(p => p.id === t.patientId);
                      return (
                        <TableRow key={t.id}>
                          <TableCell>{format(new Date(t.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</TableCell>
                          <TableCell>{t.description || t.category}</TableCell>
                          <TableCell className="text-right font-medium">₹{t.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {clinicTransactions.filter(t => t.type === 'Earning').length === 0 && <p className="text-center p-6 text-muted-foreground">No clinic consultation earnings found.</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </>}

        {/* ── PERSONAL TABS (always rendered) ── */}
        <TabsContent value="personal-patients" className="mt-4">
          <Card className="border-pink-100 dark:border-pink-900/40">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-pink-500" /> My Personal Patients
                  </CardTitle>
                  <CardDescription className="mt-1">Stored privately in your account — never shared with any clinic.</CardDescription>
                </div>
                <Button onClick={() => handleOpenPatientForm(null, 'personal')} className="border-pink-300 text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Patient
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PatientTable patients={personalPatients} onEdit={p => handleOpenPatientForm(p, 'personal')} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="personal-appointments" className="mt-4">
          <Card className="border-pink-100 dark:border-pink-900/40">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-pink-500" /> My Personal Appointments
                  </CardTitle>
                  <CardDescription className="mt-1">Stored privately in your account — never shared with any clinic.</CardDescription>
                </div>
                <Button onClick={() => handleOpenAppointmentForm(null, 'personal')} className="border-pink-300 text-pink-700 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/40" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Appointment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AppointmentTable appointments={personalAppointments} onEdit={a => handleOpenAppointmentForm(a, 'personal')} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Patient Form Dialog ── */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPatientId ? 'Edit Patient' : 'Add New Patient'}</DialogTitle>
            <DialogDescription className={`flex items-center gap-1.5 ${formTarget === 'personal' ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400'}`}>
              <Lock className="h-3.5 w-3.5" />
              {formTarget === 'personal'
                ? 'Saved to your personal account — never shared with any clinic.'
                : 'Saved to your clinic.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePatientSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={patientFormData.firstName} onChange={e => setPatientFormData(p => ({ ...p, firstName: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={patientFormData.lastName} onChange={e => setPatientFormData(p => ({ ...p, lastName: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={patientFormData.dateOfBirth} onChange={e => setPatientFormData(p => ({ ...p, dateOfBirth: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={patientFormData.gender} onValueChange={val => setPatientFormData(p => ({ ...p, gender: val as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Contact Number *</Label><Input value={patientFormData.contactNumber} onChange={e => setPatientFormData(p => ({ ...p, contactNumber: e.target.value }))} required /></div>
              <div className="space-y-2"><Label>Consult Location</Label><Input value={patientFormData.consultLocation || ''} onChange={e => setPatientFormData(p => ({ ...p, consultLocation: e.target.value }))} /></div>
            </div>
            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Patient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Appointment Form Dialog ── */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAppointmentId ? 'Edit Appointment' : 'New Appointment'}</DialogTitle>
            <DialogDescription className={`flex items-center gap-1.5 ${formTarget === 'personal' ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400'}`}>
              <Lock className="h-3.5 w-3.5" />
              {formTarget === 'personal'
                ? 'Saved to your personal account — never shared with any clinic.'
                : 'Saved to your clinic.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAppointmentSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <div>
              <Label>Patient *</Label>
              <Select value={appointmentFormData.patientId} onValueChange={val => setAppointmentFormData(a => ({ ...a, patientId: val }))}>
                <SelectTrigger><SelectValue placeholder="Select Patient" /></SelectTrigger>
                <SelectContent>
                  {(formTarget === 'personal' ? personalPatients : consultClinicPatients).map(p =>
                    <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {formTarget === 'clinic' && (
              <div>
                <Label>Doctor</Label>
                <Select value={appointmentFormData.doctorId} onValueChange={val => setAppointmentFormData(a => ({ ...a, doctorId: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Date *</Label><Input type="date" value={appointmentFormData.date} onChange={e => setAppointmentFormData(a => ({ ...a, date: e.target.value }))} required /></div>
              <div>
                <Label>Status *</Label>
                <Select value={appointmentFormData.status} onValueChange={(val: Appointment['status']) => setAppointmentFormData(a => ({ ...a, status: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Missed', 'Postponed'] as Appointment['status'][]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Start Time *</Label><Input type="time" value={appointmentFormData.startTime} onChange={e => setAppointmentFormData(a => ({ ...a, startTime: e.target.value }))} required /></div>
              <div><Label>End Time *</Label><Input type="time" value={appointmentFormData.endTime} onChange={e => setAppointmentFormData(a => ({ ...a, endTime: e.target.value }))} required /></div>
            </div>
            <div className="space-y-2"><Label>Consult Location</Label><Input value={appointmentFormData.consultLocation || ''} onChange={e => setAppointmentFormData(a => ({ ...a, consultLocation: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={appointmentFormData.notes || ''} onChange={e => setAppointmentFormData(a => ({ ...a, notes: e.target.value }))} /></div>
            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Appointment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
