

'use client';

import { useState, type FormEvent, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Appointment, Patient, Doctor, Procedure } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { CalendarDays, BellRing, PlusCircle, Trash2, Edit3, Search, UserPlus, ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, isSameDay, startOfWeek, endOfWeek, addDays, addWeeks, addMonths, eachDayOfInterval, isSameMonth, differenceInMinutes, isToday } from 'date-fns';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { addPatient } from '@/services/patient-service';
import { addAppointment, updateAppointment, deleteAppointment } from '@/services/appointment-service';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initialAppointmentData: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt' | 'patientName' | 'doctorName'> = {
  patientId: "",
  doctorId: "",
  date: new Date().toISOString().split('T')[0],
  startTime: "10:00",
  endTime: "10:30",
  procedureIds: [],
  notes: "",
  status: "Scheduled",
  isConsult: false,
  consultLocation: "",
};

const workingHours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM (8..19)

const timeToPosition = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  const totalMinutes = (hours * 60) + minutes;
  const dayStartMinutes = 8 * 60;
  // clamp so appointments outside bounds don't overflow the container
  const clamped = Math.max(dayStartMinutes, Math.min(totalMinutes, dayStartMinutes + 12 * 60));
  return ((clamped - dayStartMinutes) / (12 * 60)) * 100;
};

const timeToHeight = (startTime: string, endTime: string) => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  let diffMins = differenceInMinutes(end, start);
  // if negative or zero, set a minimum 15 minutes
  if (diffMins <= 0) diffMins = 15;
  // clamp to total view
  diffMins = Math.min(diffMins, 12 * 60);
  return (diffMins / (12 * 60)) * 100;
};

// Convert hex like #RRGGBB to rgba string with given alpha
function hexToRgba(hex: string, alpha = 1) {
  if (!hex) return `rgba(99,99,99,${alpha})`;
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized.length === 3
    ? sanitized.split('').map(s => s + s).join('')
    : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Produce column assignment for overlapping appointments within a single day column.
 * Uses clustering + greedy column assignment to ensure compact grid.
 *
 * Returns a map: id -> { colIndex, totalCols }
 */
function computeColumnsForDay(appts: Appointment[]) {
  // Convert to objects with start/end Date for sorting
  const items = appts.map(a => ({
    ...a,
    startDate: new Date(`1970-01-01T${a.startTime}`),
    endDate: new Date(`1970-01-01T${a.endTime}`),
  })).sort((x, y) => {
    const startDiff = x.startDate.getTime() - y.startDate.getTime();
    if (startDiff !== 0) return startDiff;
    return x.endDate.getTime() - y.endDate.getTime();
  });

  const result: Record<string, { colIndex: number; totalCols: number }> = {};

  // Build clusters of overlapping appointments
  let clusters: (typeof items)[] = [];
  if (items.length > 0) {
    let currentCluster = [items[0]];
    let maxEnd = items[0].endDate;

    for (let i = 1; i < items.length; i++) {
        const item = items[i];
        if (item.startDate.getTime() < maxEnd.getTime()) {
            currentCluster.push(item);
            if (item.endDate.getTime() > maxEnd.getTime()) {
                maxEnd = item.endDate;
            }
        } else {
            clusters.push(currentCluster);
            currentCluster = [item];
            maxEnd = item.endDate;
        }
    }
    clusters.push(currentCluster);
  }

  clusters.forEach(cluster => {
      // Find max number of overlapping items at any point in time within the cluster
      const columns: Date[] = [];
      cluster.forEach(item => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
              if (columns[i].getTime() <= item.startDate.getTime()) {
                  columns[i] = item.endDate;
                  result[item.id] = { colIndex: i, totalCols: 0 }; // totalCols to be updated later
                  placed = true;
                  break;
              }
          }
          if (!placed) {
              columns.push(item.endDate);
              result[item.id] = { colIndex: columns.length - 1, totalCols: 0 };
          }
      });
      const totalCols = columns.length;
      cluster.forEach(item => {
          if (result[item.id]) {
              result[item.id].totalCols = totalCols;
          }
      });
  });

  return result;
}

const AppointmentList = ({ appointments, title, searchQuery, onSearchChange, onEdit }: { appointments: Appointment[]; title: string; searchQuery: string; onSearchChange: (q: string) => void; onEdit: (app: Appointment) => void; }) => {
  if (appointments.length === 0 && !searchQuery) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">No appointments for this period.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="relative pt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search appointments..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 && searchQuery ? (
          <p className="text-muted-foreground text-center">No appointments match your search.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map(app => (
                <TableRow key={app.id}>
                  <TableCell>{format(new Date(app.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{app.startTime} - {app.endTime}</TableCell>
                  <TableCell>{app.patientName}</TableCell>
                  <TableCell>{app.doctorName}</TableCell>
                  <TableCell>
                    <Badge variant={
                      app.status === 'Completed' ? 'secondary' :
                        app.status === 'Confirmed' ? 'default' :
                          app.status === 'Cancelled' || app.status === 'Missed' ? 'destructive' :
                            'outline'
                    }>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(app)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

const QuickAddPatientForm = ({ onPatientAdded, user, clinicId }: { onPatientAdded: (patientId: string) => void; user: any; clinicId: string }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuickSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !clinicId) {
      toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
      return;
    }
    if (!firstName || !lastName || !contactNumber) {
      toast({ title: "Error", description: "First name, last name, and contact number are required.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const patientId = await addPatient(clinicId, {
        firstName,
        lastName,
        contactNumber,
        dateOfBirth: new Date().toISOString().split('T')[0],
        gender: 'Other',
      });
      if (patientId) {
        toast({ title: "Patient Added", description: `${firstName} ${lastName} has been added.` });
        onPatientAdded(patientId);
      } else {
        toast({ title: "Error", description: "Could not add patient.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error adding patient quickly:", error);
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleQuickSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quickFirstName">First Name *</Label>
          <Input id="quickFirstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required disabled={isSubmitting} />
        </div>
        <div>
          <Label htmlFor="quickLastName">Last Name *</Label>
          <Input id="quickLastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required disabled={isSubmitting} />
        </div>
      </div>
      <div>
        <Label htmlFor="quickContact">Contact Number *</Label>
        <Input id="quickContact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required disabled={isSubmitting} />
      </div>
      <DialogFooter className="pt-4 border-t">
        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Patient'}</Button>
      </DialogFooter>
    </form>
  )
}

export default function AppointmentsPage() {
  const { user, clinicId } = useUser();
  const db = useFirestore();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickAddPatientOpen, setIsQuickAddPatientOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState(initialAppointmentData);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('day');
  const [searchQuery, setSearchQuery] = useState('');

  const { toast } = useToast();

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });

  useEffect(() => {
    if (!user || !db || !clinicId) return;

    const appointmentsColRef = collection(db, 'clinics', clinicId, 'appointments');
    const unsubscribeAppointments = onSnapshot(appointmentsColRef, (snapshot) => {
      const appointmentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateA.getTime() - dateB.getTime();
        });
      setAppointments(appointmentsData);
    });

    const patientsColRef = collection(db, 'clinics', clinicId, 'patients');
    const unsubscribePatients = onSnapshot(patientsColRef, (snapshot) => {
      const patientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(patientsData);
    });

    const doctorsColRef = collection(db, 'clinics', clinicId, 'doctors');
    const unsubscribeDoctors = onSnapshot(doctorsColRef, (snapshot) => {
      const doctorsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Doctor));
      setDoctors(doctorsData);
    });

    const proceduresColRef = collection(db, 'clinics', clinicId, 'procedures');
    const unsubscribeProcedures = onSnapshot(proceduresColRef, (snapshot) => {
      const proceduresData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Procedure));
      setProcedures(proceduresData);
    });

    return () => {
      unsubscribeAppointments();
      unsubscribePatients();
      unsubscribeDoctors();
      unsubscribeProcedures();
    };
  }, [user, db, clinicId]);

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce((acc, app) => {
      const date = app.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(app);
      return acc;
    }, {} as Record<string, Appointment[]>);
  }, [appointments]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentAppointment(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>, value: string) => {
    setCurrentAppointment(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db || !clinicId) {
      toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
      return;
    }
    if (!currentAppointment.patientId || !currentAppointment.doctorId || !currentAppointment.date || !currentAppointment.startTime || !currentAppointment.endTime) {
      toast({ title: "Error", description: "Patient, Doctor, Date, Start Time and End Time are required.", variant: "destructive" });
      return;
    }

    const patient = patients.find(p => p.id === currentAppointment.patientId);
    const doctor = doctors.find(d => d.id === currentAppointment.doctorId);

    const appointmentPayload: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'> & { clinicId: string } = {
      ...currentAppointment,
      clinicId: clinicId,
      patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'N/A',
      doctorName: doctor ? doctor.name : 'N/A',
    };

    try {
        if (editingAppointmentId) {
          await updateAppointment(clinicId, editingAppointmentId, appointmentPayload);
          toast({ title: "Appointment Updated", description: "The appointment details have been updated." });
        } else {
          await addAppointment(clinicId, appointmentPayload);
          toast({ title: "Appointment Scheduled", description: "The new appointment has been added to the schedule." });
        }
        setIsFormOpen(false);
        setEditingAppointmentId(null);
        setCurrentAppointment(initialAppointmentData);
    } catch (error) {
        console.error('Failed to save appointment', error);
        toast({ title: "Error", description: "Could not save appointment.", variant: "destructive" });
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointmentId(appointment.id);
    setCurrentAppointment({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId || "",
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      procedureIds: appointment.procedureIds || [],
      notes: appointment.notes || "",
      status: appointment.status,
      isConsult: !!appointment.isConsult,
      consultLocation: appointment.consultLocation || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (appointmentToDelete && clinicId) {
      try {
        await deleteAppointment(clinicId, appointmentToDelete.id);
        toast({ title: "Appointment Cancelled", description: "The appointment has been removed from the schedule." });
      } catch (error) {
        console.error('Failed to delete appointment', error);
        toast({ title: "Error", description: "Could not delete appointment.", variant: "destructive" });
      } finally {
        setAppointmentToDelete(null);
      }
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
    if (clinicId) {
      try {
        await updateAppointment(clinicId, appointmentId, { status: newStatus });
        toast({ title: "Status Updated", description: `Appointment marked as ${newStatus}.` });
      } catch (error) {
         toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
      }
    }
  };

  const openAddForm = () => {
    setEditingAppointmentId(null);
    setCurrentAppointment(initialAppointmentData);
    setIsFormOpen(true);
  }

  const getDoctorColor = (doctorId?: string) => {
    const d = doctors.find(x => x.id === doctorId);
    return d?.color || '#6B7280';
  };

  const DayWithAppointments = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayAppointments = appointmentsByDate[dateStr] || [];

    const dayContent = (
      <div
        onClick={(e) => { e.stopPropagation(); setCurrentDate(date); }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {format(date, 'd')}
        {dayAppointments.length > 0 && (
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary"></span>
        )}
      </div>
    );

    if (dayAppointments.length === 0) return dayContent;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="w-full h-full p-0 m-0 bg-transparent border-none">
            {dayContent}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium leading-none">Appointments for {format(date, 'dd/MM/yyyy')}</h4>
              <p className="text-sm text-muted-foreground">{dayAppointments.length} appointment(s) scheduled.</p>
            </div>
            <div className="grid gap-2">
              {dayAppointments.map(app => (
                <div key={app.id} className="text-sm">
                  <strong>{app.startTime}</strong>: {app.patientName} with {app.doctorName}
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const visibleAppointments = useMemo(() => {
    let baseList: Appointment[] = [];
    if (activeTab === 'day') {
      baseList = appointments.filter(app => isSameDay(new Date(app.date), currentDate));
    } else if (activeTab === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      baseList = appointments.filter(app => {
        const appDate = new Date(app.date);
        return appDate >= start && appDate <= end;
      });
    } else if (activeTab === 'month') {
      baseList = appointments.filter(app => isSameMonth(new Date(app.date), currentDate));
    }

    if (searchQuery.trim() === '') {
      return baseList;
    }

    const q = searchQuery.toLowerCase();
    return baseList.filter(app =>
      (app.patientName?.toLowerCase() || '').includes(q) ||
      (app.doctorName?.toLowerCase() || '').includes(q) ||
      (app.notes?.toLowerCase() || '').includes(q) ||
      (app.status?.toLowerCase() || '').includes(q)
    );
  }, [appointments, currentDate, activeTab, searchQuery]);

  const listTitle = useMemo(() => {
    if (activeTab === 'day') return `Agenda for ${format(currentDate, 'dd/MM/yyyy')}`;
    if (activeTab === 'week') return `Agenda for Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`;
    if (activeTab === 'month') return `Agenda for ${format(currentDate, 'MMMM yyyy')}`;
    return 'Agenda';
  }, [currentDate, activeTab]);

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    const increment = direction === 'next' ? 1 : -1;
    if (activeTab === 'day') setCurrentDate(addDays(currentDate, increment));
    if (activeTab === 'week') setCurrentDate(addWeeks(currentDate, increment));
    if (activeTab === 'month') setCurrentDate(addMonths(currentDate, increment));
  };

  return (
    <TooltipProvider>
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <CalendarDays className="mr-3 h-8 w-8 text-special2" />
            Appointments
          </h1>
          <Button onClick={openAddForm} disabled={!user}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Appointment
          </Button>
        </div>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) { setEditingAppointmentId(null); setCurrentAppointment(initialAppointmentData); }
        }}>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>{editingAppointmentId ? 'Edit Appointment' : 'Schedule New Appointment'}</DialogTitle>
              <CardDescription>Fill in the details for the appointment.</CardDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                  <Label htmlFor="patientId">Patient *</Label>
                  <div className="flex gap-2">
                    <Select name="patientId" value={currentAppointment.patientId} onValueChange={(val) => handleSelectChange('patientId', val)} required>
                      <SelectTrigger><SelectValue placeholder="Select Patient" /></SelectTrigger>
                      <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.isConsult ? '(Consult)' : ''}</SelectItem>)}</SelectContent>
                    </Select>
                    <Dialog open={isQuickAddPatientOpen} onOpenChange={setIsQuickAddPatientOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" aria-label="Add new patient">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Quick Add Patient</DialogTitle>
                          <CardDescription>Add a new patient for OPD.</CardDescription>
                        </DialogHeader>
                        {clinicId && <QuickAddPatientForm user={user} clinicId={clinicId} onPatientAdded={(patientId) => {
                          handleSelectChange('patientId', patientId);
                          setIsQuickAddPatientOpen(false);
                        }} />}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                <div>
                  <Label htmlFor="doctorId">Doctor *</Label>
                  <Select name="doctorId" value={currentAppointment.doctorId || ''} onValueChange={(val) => handleSelectChange('doctorId', val)} required>
                    <SelectTrigger><SelectValue placeholder="Select Doctor" /></SelectTrigger>
                    <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="date">Date *</Label><Input id="date" name="date" type="date" value={currentAppointment.date} onChange={handleInputChange} required /></div>
                  <div>
                    <Label htmlFor="status">Status *</Label>
                    <Select name="status" value={currentAppointment.status} onValueChange={(val: Appointment['status']) => handleSelectChange('status', val)} required>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Missed', 'Postponed'] as Appointment['status'][]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><Label htmlFor="startTime">Start Time *</Label><Input id="startTime" name="startTime" type="time" value={currentAppointment.startTime} onChange={handleInputChange} required /></div>
                  <div><Label htmlFor="endTime">End Time *</Label><Input id="endTime" name="endTime" type="time" value={currentAppointment.endTime} onChange={handleInputChange} required /></div>
                </div>
                <div className="items-start flex space-x-2">
                  <Checkbox id="isConsult" checked={currentAppointment.isConsult} onCheckedChange={(checked) => setCurrentAppointment(prev => ({ ...prev, isConsult: !!checked }))} />
                  <div className="grid gap-1.5 leading-none"><Label htmlFor="isConsult" className="text-sm font-medium">This is a consultation appointment</Label></div>
                </div>

                {currentAppointment.isConsult && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="consultLocation">Consult Location / Clinic Name</Label>
                    <Input id="consultLocation" name="consultLocation" value={currentAppointment.consultLocation || ''} onChange={handleInputChange} placeholder="e.g., City General Hospital" />
                  </div>
                )}

                <div>
                  <Label>Linked Procedures</Label>
                  <div className="border rounded-md p-2 space-y-1 max-h-40 overflow-y-auto">
                    {procedures.length === 0 ? <p className="text-sm text-muted-foreground">No procedures found.</p> : procedures.map(proc => (
                      <div key={proc.id} className="flex items-center space-x-2">
                        <Checkbox checked={currentAppointment.procedureIds.includes(proc.id)} onCheckedChange={() => setCurrentAppointment(prev => ({ ...prev, procedureIds: prev.procedureIds.includes(proc.id) ? prev.procedureIds.filter(id => id !== proc.id) : [...prev.procedureIds, proc.id] }))} />
                        <span className="text-sm">{proc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div><Label htmlFor="notes">Additional Notes (Optional)</Label><Textarea id="notes" name="notes" value={currentAppointment.notes || ''} onChange={handleInputChange} placeholder="Any specific instructions or details for the appointment." /></div>
              </div>
              <DialogFooter className="pt-4 border-t"><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit">{editingAppointmentId ? 'Save Changes' : 'Schedule Appointment'}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="day" className="w-full" onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="w-full flex justify-center">
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </div>
            <div className="flex items-center gap-2 w-full justify-center">
              <Button variant="outline" size="icon" onClick={() => handleDateNavigation('prev')}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="font-semibold text-center w-48">
                {activeTab === 'day' && (isToday(currentDate) ? 'Today' : format(currentDate, 'dd/MM/yyyy'))}
                {activeTab === 'week' && `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')}`}
                {activeTab === 'month' && format(currentDate, 'MMMM yyyy')}
              </span>
              <Button variant="outline" size="icon" onClick={() => handleDateNavigation('next')}><ChevronRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
            </div>
          </div>

          {/* ---------------- DAY VIEW ---------------- */}
          <TabsContent value="day" className="mt-4">
            <Card className="shadow-lg">
              <CardHeader><CardTitle>Day View: {format(currentDate, 'dd/MM/yyyy')}</CardTitle></CardHeader>
              <CardContent className="relative h-[600px] overflow-auto">
                <div className="grid grid-cols-[60px_1fr] h-full min-w-[500px]">
                  <div className="border-r">
                    {workingHours.map(hour => (
                      <div key={hour} className="h-[50px] text-right pr-2 text-xs text-muted-foreground border-t -mt-px pt-1">{format(new Date(0).setHours(hour), 'ha')}</div>
                    ))}
                  </div>

                  <div className="relative">
                    {/* hour separators */}
                    {workingHours.map(hour => <div key={hour} className="h-[50px] border-t -mt-px" />)}

                    {/* appointments for this day */}
                    {(() => {
                      const dayKey = format(currentDate, 'yyyy-MM-dd');
                      const arr = appointmentsByDate[dayKey] || [];
                      if (arr.length === 0) return null;

                      const layout = computeColumnsForDay(arr);

                      return arr.map(app => {
                        const color = getDoctorColor(app.doctorId);
                        const bg = hexToRgba(color, 0.12);
                        const border = color;

                        const top = timeToPosition(app.startTime);
                        const height = timeToHeight(app.startTime, app.endTime);

                        const assigned = layout[app.id] ?? { colIndex: 0, totalCols: 1 };
                        const totalCols = Math.max(1, assigned.totalCols);
                        const colIndex = Math.max(0, assigned.colIndex);

                        const widthPercent = 100 / totalCols;
                        const leftPercent = colIndex * widthPercent;
                        const gapPx = 2; // Reduced gap
                        const styleWidth = `calc(${widthPercent}% - ${gapPx}px)`;


                        return (
                          <Tooltip key={app.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn('absolute p-2 rounded-md border text-sm shadow-sm overflow-hidden cursor-pointer')}
                                style={{
                                  top: `${top}%`,
                                  height: `${height}%`,
                                  left: `${leftPercent}%`,
                                  width: styleWidth,
                                  background: bg,
                                  borderColor: border,
                                  boxSizing: 'border-box',
                                }}
                                onClick={() => handleEdit(app)}
                              >
                                <p className="font-semibold truncate leading-tight">{app.patientName}</p>
                                <p className="truncate leading-tight text-muted-foreground">{app.doctorName}</p>
                                <p className="text-[11px] text-muted-foreground">{app.startTime} - {app.endTime}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">
                              <p><strong>{app.patientName}</strong></p>
                              <p>{app.startTime} – {app.endTime} with {app.doctorName}</p>
                              <p>Status: {app.status}</p>
                              {app.isConsult && <p>Consult at: {app.consultLocation}</p>}
                            </TooltipContent>
                          </Tooltip>
                        );
                      });
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- WEEK VIEW ---------------- */}
          <TabsContent value="week" className="mt-4">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Week View: {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="relative h-[600px] overflow-auto">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[1200px]">
                  {/* Time column */}
                  <div className="border-r">
                    {workingHours.map(hour => (
                      <div key={hour} className="h-[50px] text-right pr-2 text-xs text-muted-foreground border-t -mt-px pt-1">{format(new Date(0).setHours(hour), 'ha')}</div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const arr = appointmentsByDate[dayKey] || [];
                    const layout = computeColumnsForDay(arr);

                    return (
                      <div key={day.toString()} className="relative border-r last:border-r-0">
                        <h3 className={cn("sticky top-0 z-10 bg-muted/50 backdrop-blur-sm text-center font-semibold text-sm py-1 border-b", isToday(day) && "text-primary bg-primary/10")}>{format(day, 'EEE d')}</h3>
                        <div className="relative h-full">
                          {workingHours.map(hour => <div key={hour} className="h-[50px] border-t -mt-px" />)}

                          {(arr || []).map(app => {
                            const color = getDoctorColor(app.doctorId);
                            const bg = hexToRgba(color, 0.12);
                            const border = color;

                            const top = timeToPosition(app.startTime);
                            const height = timeToHeight(app.startTime, app.endTime);

                            const assigned = layout[app.id] ?? { colIndex: 0, totalCols: 1 };
                            const totalCols = Math.max(1, assigned.totalCols);
                            const colIndex = Math.max(0, assigned.colIndex);

                            const widthPercent = 100 / totalCols;
                            const leftPercent = colIndex * widthPercent;
                            const gapPx = 2; // Reduced gap
                            const styleWidth = `calc(${widthPercent}% - ${gapPx}px)`;

                            return (
                              <Tooltip key={app.id}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn('absolute p-1 rounded border text-[10px] shadow-sm overflow-hidden cursor-pointer')}
                                    style={{
                                      top: `${top}%`,
                                      height: `${height}%`,
                                      left: `${leftPercent}%`,
                                      width: styleWidth,
                                      background: bg,
                                      borderColor: border,
                                      boxSizing: 'border-box',
                                    }}
                                    onClick={() => handleEdit(app)}
                                  >
                                    <p className="font-bold truncate leading-tight">{app.patientName}</p>
                                    <p className="truncate leading-tight text-muted-foreground">{app.doctorName}</p>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs">
                                  <p><strong>{app.patientName}</strong></p>
                                  <p>{app.startTime} – {app.endTime} with {app.doctorName}</p>
                                  <p>Status: {app.status}</p>
                                  {app.isConsult && <p>Consult at: {app.consultLocation}</p>}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- MONTH VIEW (unchanged) ---------------- */}
          <TabsContent value="month" className="mt-4">
            <Card className="shadow-lg">
              <CardHeader><CardTitle className="flex items-center"><CalendarIcon className="mr-2 h-5 w-5" /> Calendar Overview</CardTitle></CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={(day) => day && setCurrentDate(day)}
                  className="p-0"
                  components={{ DayContent: DayWithAppointments }}
                  month={currentDate}
                  onMonthChange={setCurrentDate}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AppointmentList appointments={visibleAppointments} title={listTitle} searchQuery={searchQuery} onSearchChange={setSearchQuery} onEdit={handleEdit} />

      </div>
    </TooltipProvider>
  );
}
