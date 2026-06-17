
'use client';
import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Patient, Appointment, Transaction, Doctor, Procedure } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { UsersRound, CalendarDays, MapPin, PlusCircle, Edit3, Info } from 'lucide-react';
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
  patientId: "", doctorId: "", date: new Date().toISOString().split('T')[0], startTime: "10:00", endTime: "10:30", procedureIds: [], notes: "", status: "Scheduled", isConsult: true, consultLocation: "",
};


export default function ConsultationDashboardPage() {
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // True when this user has no clinic — data goes to personal store
  const isPersonalMode = !clinicId;

  // Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false);
  
  // Form State
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [patientFormData, setPatientFormData] = useState(initialPatientData);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentFormData, setAppointmentFormData] = useState(initialAppointmentData);

  useEffect(() => {
    if (!user || !db) {
      setLoading(false);
      return;
    }

    const unsubs: (() => void)[] = [];

    if (isPersonalMode) {
      // ── PERSONAL MODE: read from users/{uid}/personalConsultation/... ──
      const uid = user.uid;

      const unsubPatients = onSnapshot(getPersonalConsultCol(uid, 'patients'), (snap) => {
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
        setLoading(false);
      });

      const unsubAppointments = onSnapshot(getPersonalConsultCol(uid, 'appointments'), (snap) => {
        setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      });

      const unsubTransactions = onSnapshot(
        query(getPersonalConsultCol(uid, 'transactions'), where('isConsult', '==', true)),
        (snap) => {
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        }
      );

      unsubs.push(unsubPatients, unsubAppointments, unsubTransactions);
    } else {
      // ── CLINIC MODE: read from clinics/{clinicId}/... (original behavior) ──
      const unsubPatients = onSnapshot(query(collection(db, 'clinics', clinicId!, 'patients')), (snap) => {
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
        setLoading(false);
      });

      const unsubAppointments = onSnapshot(query(collection(db, 'clinics', clinicId!, 'appointments')), (snap) => {
        setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Appointment)));
      });

      const unsubTransactions = onSnapshot(
        query(collection(db, 'clinics', clinicId!, 'transactions'), where('isConsult', '==', true)),
        (snap) => {
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        }
      );

      const unsubDoctors = onSnapshot(collection(db, 'clinics', clinicId!, 'doctors'), (snap) => {
        setDoctors(snap.docs.map(d => ({ id: d.id, ...d.data() } as Doctor)));
      });

      const unsubProcedures = onSnapshot(collection(db, 'clinics', clinicId!, 'procedures'), (snap) => {
        setProcedures(snap.docs.map(d => ({ id: d.id, ...d.data() } as Procedure)));
      });

      unsubs.push(unsubPatients, unsubAppointments, unsubTransactions, unsubDoctors, unsubProcedures);
      setLoading(false);
    }

    return () => unsubs.forEach(u => u());
  }, [user, db, clinicId, isPersonalMode]);
  
  const consultPatients = useMemo(() => patients.filter(p => p.isConsult), [patients]);
  const consultAppointments = useMemo(() => appointments.filter(a => a.isConsult), [appointments]);
  
  const totalConsultRevenue = useMemo(() => {
    return transactions.filter(t => t.type === 'Earning').reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);
  
  // Patient Form Handlers
  const handleOpenPatientForm = (patient: Patient | null) => {
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
      if (isPersonalMode) {
        // Personal mode — no clinicId needed
        if (editingPatientId) {
          await updatePersonalConsultPatient(user.uid, editingPatientId, patientFormData);
          toast({ title: "Patient Updated" });
        } else {
          await addPersonalConsultPatient(user.uid, { ...patientFormData, isConsult: true });
          toast({ title: "Consult Patient Added" });
        }
      } else {
        // Clinic mode
        if (editingPatientId) {
          await updatePatient(clinicId!, editingPatientId, patientFormData);
          toast({ title: "Patient Updated" });
        } else {
          await addPatient(clinicId!, { ...patientFormData, isConsult: true });
          toast({ title: "Consult Patient Added" });
        }
      }
      setIsPatientFormOpen(false);
    } catch (err) {
      toast({ title: "Error", description: "Could not save patient.", variant: "destructive" });
    }
  };

  // Appointment Form Handlers
  const handleOpenAppointmentForm = (appointment: Appointment | null) => {
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

    const patient = patients.find(p => p.id === appointmentFormData.patientId);
    const doctor = doctors.find(d => d.id === appointmentFormData.doctorId);

    const payload = {
      ...appointmentFormData,
      isConsult: true,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'N/A',
      doctorName: doctor ? doctor.name : 'N/A',
    };

    try {
      if (isPersonalMode) {
        if (editingAppointmentId) {
          await updatePersonalConsultAppointment(user.uid, editingAppointmentId, payload);
          toast({ title: "Appointment Updated" });
        } else {
          await addPersonalConsultAppointment(user.uid, payload);
          toast({ title: "Consult Appointment Scheduled" });
        }
      } else {
        if (editingAppointmentId) {
          await updateAppointment(clinicId!, editingAppointmentId, payload);
          toast({ title: "Appointment Updated" });
        } else {
          await addAppointment(clinicId!, payload);
          toast({ title: "Consult Appointment Scheduled" });
        }
      }
      setIsAppointmentFormOpen(false);
    } catch (err) {
      toast({ title: "Error", description: "Could not save appointment.", variant: "destructive" });
    }
  };

  if (loading) {
    return <div>Loading consultation data...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <UsersRound className="mr-3 h-8 w-8 text-accent" />
          Consultation Dashboard
        </h1>
        {isPersonalMode && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-4 py-3 text-sm text-blue-700 dark:text-blue-300 max-w-sm">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Personal mode:</strong> This data is stored privately in your account and is not shared with any clinic.
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="patients" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            <TabsTrigger value="patients">Patients ({consultPatients.length})</TabsTrigger>
            <TabsTrigger value="appointments">Appointments ({consultAppointments.length})</TabsTrigger>
            <TabsTrigger value="financials">Financials</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="patients" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Consultation Patients</CardTitle>
                <Button onClick={() => handleOpenPatientForm(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Patient</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {consultPatients.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.firstName} {p.lastName}</TableCell>
                      <TableCell>{p.contactNumber}</TableCell>
                      <TableCell className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{p.consultLocation || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPatientForm(p)}><Edit3 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {consultPatients.length === 0 && <p className="text-center p-4 text-muted-foreground">No consultation patients found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="appointments" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Consultation Appointments</CardTitle>
                <Button onClick={() => handleOpenAppointmentForm(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Appointment</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Time</TableHead><TableHead>Patient</TableHead><TableHead>Status</TableHead><TableHead>Location</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {consultAppointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => (
                    <TableRow key={a.id}>
                      <TableCell>{format(new Date(a.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{a.startTime}</TableCell>
                      <TableCell>{a.patientName}</TableCell>
                      <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                      <TableCell className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground"/>{a.consultLocation || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenAppointmentForm(a)}><Edit3 className="h-4 w-4"/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {consultAppointments.length === 0 && <p className="text-center p-4 text-muted-foreground">No consultation appointments found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="financials" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultation Financials</CardTitle>
              <CardDescription>Total revenue from consultations: <span className="font-bold text-primary">₹{totalConsultRevenue.toLocaleString()}</span></CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Patient</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {transactions.filter(t => t.type === 'Earning').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                    const patient = consultPatients.find(p => p.id === t.patientId);
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
              {transactions.filter(t => t.type === 'Earning').length === 0 && <p className="text-center p-4 text-muted-foreground">No consultation earnings found.</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Patient Form Dialog */}
      <Dialog open={isPatientFormOpen} onOpenChange={setIsPatientFormOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPatientId ? 'Edit Consult Patient' : 'Add New Consult Patient'}</DialogTitle>
            {isPersonalMode && (
              <DialogDescription className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Info className="h-3.5 w-3.5" /> Saved to your personal account, not shared with any clinic.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handlePatientSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name *</Label><Input value={patientFormData.firstName} onChange={e => setPatientFormData(p => ({ ...p, firstName: e.target.value }))} required/></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={patientFormData.lastName} onChange={e => setPatientFormData(p => ({ ...p, lastName: e.target.value }))} required/></div>
              <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={patientFormData.dateOfBirth} onChange={e => setPatientFormData(p => ({ ...p, dateOfBirth: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Gender</Label><Select value={patientFormData.gender} onValueChange={val => setPatientFormData(p => ({ ...p, gender: val as any }))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Contact Number *</Label><Input value={patientFormData.contactNumber} onChange={e => setPatientFormData(p => ({ ...p, contactNumber: e.target.value }))} required/></div>
              <div className="space-y-2"><Label>Consult Location</Label><Input value={patientFormData.consultLocation || ''} onChange={e => setPatientFormData(p => ({ ...p, consultLocation: e.target.value }))} /></div>
            </div>
            <DialogFooter className="pt-4 border-t sticky bottom-0 bg-background">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Patient</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Appointment Form Dialog */}
      <Dialog open={isAppointmentFormOpen} onOpenChange={setIsAppointmentFormOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAppointmentId ? 'Edit Consult Appointment' : 'New Consult Appointment'}</DialogTitle>
            {isPersonalMode && (
              <DialogDescription className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Info className="h-3.5 w-3.5" /> Saved to your personal account, not shared with any clinic.
              </DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleAppointmentSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <div>
              <Label>Patient *</Label>
              <Select value={appointmentFormData.patientId} onValueChange={val => setAppointmentFormData(a => ({ ...a, patientId: val }))} required>
                <SelectTrigger><SelectValue placeholder="Select Patient" /></SelectTrigger>
                <SelectContent>{patients.filter(p => p.isConsult).map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!isPersonalMode && (
              <div>
                <Label>Doctor *</Label>
                <Select value={appointmentFormData.doctorId} onValueChange={val => setAppointmentFormData(a => ({ ...a, doctorId: val }))} required>
                  <SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger>
                  <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Date *</Label><Input type="date" value={appointmentFormData.date} onChange={e => setAppointmentFormData(a => ({ ...a, date: e.target.value }))} required /></div>
              <div>
                <Label>Status *</Label>
                <Select value={appointmentFormData.status} onValueChange={(val: Appointment['status']) => setAppointmentFormData(a => ({ ...a, status: val }))} required>
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
