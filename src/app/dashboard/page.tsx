'use client';

import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';
import type { Patient, Appointment, Transaction, Operatory, Doctor } from '@/types';
import {
    Users,
    Calendar,
    DollarSign,
    CreditCard,
    Plus,
    AlertTriangle,
    MessageSquare,
    ArrowRight,
    ClipboardList,
    UserPlus,
    Stethoscope,
    IndianRupee,
    FileText,
    Image as ImageIcon,
    Wallet,
    Beaker,
    Loader2,
    GraduationCap,
    UsersRound,
    Medal,
    Tag,
    UserCheck,
    CheckCircle2,
} from 'lucide-react';
import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot, doc, query, where, getCountFromServer } from 'firebase/firestore';
import { isSameDay, startOfMonth, isSameMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { updateAppointment, addAppointment } from '@/services/appointment-service';
import { addPatient } from '@/services/patient-service';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import type { Drug, PrescriptionItem, Procedure, TransactionType, PaymentMethod, TransactionCategory } from '@/types';
import { CalendarPlus, Trash2, Receipt } from 'lucide-react';


// Reusable components from user's example, adapted to TSX and project styles

function StatCard({ title, value, icon, highlight, success, danger }: { title: string, value: string, icon: React.ReactNode, highlight?: boolean, success?: boolean, danger?: boolean }) {
    return (
        <Card className={cn(
            "shadow-sm",
            success && "bg-green-50 dark:bg-green-500/10",
            danger && "bg-red-50 dark:bg-red-500/10",
            highlight && "ring-2 ring-primary"
        )}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-semibold">{value}</div>
            </CardContent>
        </Card>
    );
}

const STATUS_COLORS: Record<Appointment['status'], string> = {
    Scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
    Confirmed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200',
    Completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
    Cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-200',
    Missed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
    Postponed: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

function QueueItem({ 
    time, 
    name, 
    procedure, 
    status, 
    onStatusChange 
}: { 
    time: string, 
    name: string, 
    procedure?: string, 
    status: Appointment['status'], 
    onStatusChange?: (newStatus: Appointment['status']) => void 
}) {
    return (
        <div className="flex justify-between items-center py-3 border-b text-sm gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
                <strong className="w-12 text-muted-foreground shrink-0">{time}</strong>
                <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{name}</p>
                    {procedure && <div className="text-muted-foreground text-xs truncate">{procedure}</div>}
                </div>
            </div>
            <div className="shrink-0">
                <Select value={status} onValueChange={(val) => onStatusChange?.(val as Appointment['status'])}>
                    <SelectTrigger className={cn(
                        "w-[125px] h-7 text-xs border-none font-semibold rounded-full px-2.5 focus:ring-0 focus:ring-offset-0 justify-between items-center flex cursor-pointer transition-colors duration-200",
                        STATUS_COLORS[status] || "bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-200"
                    )}>
                        <SelectValue placeholder={status} />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(STATUS_COLORS) as Appointment['status'][]).map((s) => (
                            <SelectItem key={s} value={s} className="text-xs cursor-pointer">
                                <span className={cn(
                                    "inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle",
                                    s === 'Scheduled' && 'bg-blue-500',
                                    s === 'Confirmed' && 'bg-indigo-500',
                                    s === 'Completed' && 'bg-green-500',
                                    s === 'Cancelled' && 'bg-gray-500',
                                    s === 'Missed' && 'bg-yellow-500',
                                    s === 'Postponed' && 'bg-red-500'
                                )}></span>
                                <span className="align-middle">{s}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}


function ActionButton({ 
    icon, 
    label, 
    href, 
    onClick,
    className 
}: { 
    icon: React.ReactNode; 
    label: string; 
    href?: string; 
    onClick?: () => void;
    className?: string;
}) {
    if (onClick) {
        return (
            <Button 
                type="button" 
                variant="outline" 
                onClick={onClick} 
                className={cn(
                    "w-full justify-start gap-3 py-6 text-sm font-medium transition-all duration-200 border shadow-xs hover:scale-[1.01] active:scale-[0.99]",
                    className
                )}
            >
                {icon}
                {label}
            </Button>
        );
    }

    return (
        <Button 
            asChild 
            variant="outline" 
            className={cn(
                "w-full justify-start gap-3 py-6 text-sm font-medium transition-all duration-200 border shadow-xs hover:scale-[1.01] active:scale-[0.99]",
                className
            )}
        >
            <Link href={href || '#'}>
                {icon}
                {label}
            </Link>
        </Button>
    );
}

function FinancialRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <strong className="font-medium">{value}</strong>
        </div>
    );
}

export default function DashboardPage() {
    const SHOW_FOUNDER_PROGRAM = false;

    const { user, clinicId, clinicLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const [patients, setPatients] = useState<Patient[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [operatories, setOperatories] = useState<Operatory[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [labs, setLabs] = useState<{ id: string, name: string, email: string }[]>([]);
    const [greeting, setGreeting] = useState('');

    // Founder Program logic state
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [activeDates, setActiveDates] = useState<string[]>([]);
    const [isFounder, setIsFounder] = useState<boolean>(false);
    const [founderCount, setFounderCount] = useState<number>(0);
    const [isFounderDialogOpen, setIsFounderDialogOpen] = useState(false);

    // Drugs & Procedures for Prescription and Appointment dialogs
    const [drugs, setDrugs] = useState<Drug[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);

    // Modal visibility states
    const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
    const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
    const [isTransactionOpen, setIsTransactionOpen] = useState(false);
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [modalSubmitting, setModalSubmitting] = useState(false);

    // 1. Patient Form State
    const [patientForm, setPatientForm] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        gender: 'Other' as Patient['gender'],
        dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
        email: '',
        address: '',
        medicalHistory: '',
        allergies: '',
        isConsult: false,
        consultLocation: '',
    });

    const handleCreatePatient = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!clinicId) {
            toast({ title: 'Error', description: 'Clinic not selected.', variant: 'destructive' });
            return;
        }
        if (!patientForm.firstName || !patientForm.lastName || !patientForm.contactNumber) {
            toast({ title: 'Missing Information', description: 'First name, last name, and contact number are required.', variant: 'destructive' });
            return;
        }

        setModalSubmitting(true);
        try {
            await addPatient(clinicId, {
                ...patientForm,
                markedTeeth: [],
                stagedObservations: [],
            });
            toast({ title: 'Patient Added', description: `${patientForm.firstName} ${patientForm.lastName} has been added.` });
            setIsNewPatientOpen(false);
            setPatientForm({
                firstName: '',
                lastName: '',
                contactNumber: '',
                gender: 'Other',
                dateOfBirth: format(new Date(), 'yyyy-MM-dd'),
                email: '',
                address: '',
                medicalHistory: '',
                allergies: '',
                isConsult: false,
                consultLocation: '',
            });
        } catch (error: any) {
            console.error('Failed to add patient:', error);
            toast({ title: 'Error', description: error?.message || 'Could not add patient.', variant: 'destructive' });
        } finally {
            setModalSubmitting(false);
        }
    };

    // 2. Full Appointment Form State (matches /appointments page exactly)
    const [appointmentForm, setAppointmentForm] = useState({
        patientId: '',
        doctorId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '10:00',
        endTime: '10:30',
        status: 'Scheduled' as Appointment['status'],
        isConsult: false,
        consultLocation: '',
        procedureIds: [] as string[],
        notes: '',
    });

    const handleCreateAppointment = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!clinicId) {
            toast({ title: 'Error', description: 'No active clinic selected.', variant: 'destructive' });
            return;
        }
        if (!appointmentForm.patientId || !appointmentForm.doctorId || !appointmentForm.date || !appointmentForm.startTime || !appointmentForm.endTime) {
            toast({ title: 'Missing Information', description: 'Patient, Doctor, Date, and Time are required.', variant: 'destructive' });
            return;
        }

        const patient = patients.find(p => p.id === appointmentForm.patientId);
        const doctor = doctors.find(d => d.id === appointmentForm.doctorId);

        setModalSubmitting(true);
        try {
            await addAppointment(clinicId, {
                patientId: appointmentForm.patientId,
                patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
                doctorId: appointmentForm.doctorId,
                doctorName: doctor ? doctor.name : 'Unknown Doctor',
                date: appointmentForm.date,
                startTime: appointmentForm.startTime,
                endTime: appointmentForm.endTime,
                status: appointmentForm.status,
                isConsult: appointmentForm.isConsult,
                consultLocation: appointmentForm.consultLocation,
                procedureIds: appointmentForm.procedureIds,
                notes: appointmentForm.notes,
            });

            toast({ title: 'Appointment Scheduled', description: 'New appointment successfully created.' });
            setIsAppointmentOpen(false);
            setAppointmentForm({
                patientId: '',
                doctorId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                startTime: '10:00',
                endTime: '10:30',
                status: 'Scheduled',
                isConsult: false,
                consultLocation: '',
                procedureIds: [],
                notes: '',
            });
        } catch (error: any) {
            console.error('Failed to schedule appointment:', error);
            toast({ title: 'Error', description: error?.message || 'Could not schedule appointment.', variant: 'destructive' });
        } finally {
            setModalSubmitting(false);
        }
    };

    // 3. Transaction / Invoice Form State (matches /financials transaction recording)
    const [transactionForm, setTransactionForm] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        type: 'Earning' as TransactionType,
        category: 'Consultation Fee' as TransactionCategory,
        amount: '',
        paymentMethod: 'Cash' as PaymentMethod,
        patientId: '',
        isConsult: false,
        consultLocation: '',
        description: '',
    });

    const handleCreateTransaction = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !db || !clinicId) {
            toast({ title: 'Error', description: 'Not authenticated with clinic.', variant: 'destructive' });
            return;
        }
        const amt = parseFloat(transactionForm.amount);
        if (isNaN(amt) || amt <= 0) {
            toast({ title: 'Invalid Amount', description: 'Please enter a valid amount greater than 0.', variant: 'destructive' });
            return;
        }

        setModalSubmitting(true);
        try {
            const payload = {
                date: transactionForm.date,
                paymentDate: transactionForm.paymentDate,
                type: transactionForm.type,
                category: transactionForm.category,
                amount: amt,
                paymentMethod: transactionForm.paymentMethod,
                patientId: transactionForm.patientId || null,
                isConsult: transactionForm.isConsult,
                consultLocation: transactionForm.consultLocation || '',
                description: transactionForm.description || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'clinics', clinicId, 'transactions'), payload);
            toast({ title: 'Transaction Recorded', description: `${transactionForm.type} of ₹${amt.toLocaleString()} recorded.` });
            setIsTransactionOpen(false);
            setTransactionForm({
                date: format(new Date(), 'yyyy-MM-dd'),
                paymentDate: format(new Date(), 'yyyy-MM-dd'),
                type: 'Earning',
                category: 'Consultation Fee',
                amount: '',
                paymentMethod: 'Cash',
                patientId: '',
                isConsult: false,
                consultLocation: '',
                description: '',
            });
        } catch (error: any) {
            console.error('Failed to add transaction:', error);
            toast({ title: 'Error', description: error?.message || 'Could not record transaction.', variant: 'destructive' });
        } finally {
            setModalSubmitting(false);
        }
    };

    // 4. Prescription Form State (matches /pharmacy creation)
    const [prescriptionForm, setPrescriptionForm] = useState({
        patientId: '',
        doctorId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        items: [{ drugId: '', drugName: '', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', notes: '' }] as PrescriptionItem[],
    });

    const handlePrescriptionItemChange = (idx: number, field: keyof PrescriptionItem, val: string) => {
        setPrescriptionForm(prev => {
            const items = [...prev.items];
            items[idx] = { ...items[idx], [field]: val };
            if (field === 'drugId') {
                const found = drugs.find(d => d.id === val);
                items[idx].drugName = found ? `${found.genericName} (${found.brandName || 'Generic'}) - ${found.strength || ''}` : '';
            }
            return { ...prev, items };
        });
    };

    const addPrescriptionItemRow = () => {
        setPrescriptionForm(prev => ({
            ...prev,
            items: [...prev.items, { drugId: '', drugName: '', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', notes: '' }],
        }));
    };

    const removePrescriptionItemRow = (idx: number) => {
        setPrescriptionForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx),
        }));
    };

    const handleCreatePrescription = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !db || !clinicId) {
            toast({ title: 'Error', description: 'Not authenticated with clinic.', variant: 'destructive' });
            return;
        }
        if (!prescriptionForm.patientId || !prescriptionForm.doctorId) {
            toast({ title: 'Missing Information', description: 'Patient and Doctor are required.', variant: 'destructive' });
            return;
        }
        if (prescriptionForm.items.length === 0 || prescriptionForm.items.some(it => !it.drugId || !it.dosage)) {
            toast({ title: 'Incomplete Medications', description: 'Please choose a drug and dosage for each row.', variant: 'destructive' });
            return;
        }

        setModalSubmitting(true);
        try {
            const payload = {
                ...prescriptionForm,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            await addDoc(collection(db, 'clinics', clinicId, 'prescriptions'), payload);
            toast({ title: 'Prescription Created', description: 'New prescription recorded successfully.' });
            setIsPrescriptionOpen(false);
            setPrescriptionForm({
                patientId: '',
                doctorId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                notes: '',
                items: [{ drugId: '', drugName: '', dosage: '1 Tab', frequency: 'BD', duration: '5 Days', notes: '' }],
            });
        } catch (error: any) {
            console.error('Failed to create prescription:', error);
            toast({ title: 'Error', description: error?.message || 'Could not save prescription.', variant: 'destructive' });
        } finally {
            setModalSubmitting(false);
        }
    };

    useEffect(() => {
        const getGreeting = () => {
            const hour = new Date().getHours();
            if (hour < 12) return "Good morning";
            if (hour < 18) return "Good afternoon";
            return "Good evening";
        };

        if (user?.displayName) {
            const firstName = user.displayName.split(' ')[0];
            setGreeting(`${getGreeting()}, ${firstName}!`);
        } else if (!clinicLoading) {
            setGreeting(`${getGreeting()}!`);
        }
    }, [user, clinicLoading]);


    useEffect(() => {
        if (!user || !db || !clinicId) return;

        const patientsCol = collection(db, 'clinics', clinicId, 'patients');
        const unsubPatients = onSnapshot(patientsCol, (snap) => setPatients(snap.docs.map(d => ({ ...d.data(), id: d.id } as Patient))));

        const appointmentsCol = collection(db, 'clinics', clinicId, 'appointments');
        const unsubAppointments = onSnapshot(appointmentsCol, (snap) => setAppointments(snap.docs.map(d => ({ ...d.data(), id: d.id } as Appointment))));

        const transactionsCol = collection(db, 'clinics', clinicId, 'transactions');
        const unsubTransactions = onSnapshot(transactionsCol, (snap) => setTransactions(snap.docs.map(d => ({ ...d.data(), id: d.id } as Transaction))));

        const operatoriesCol = collection(db, 'clinics', clinicId, 'operatories');
        const unsubOperatories = onSnapshot(operatoriesCol, (snap) => setOperatories(snap.docs.map(d => ({ ...d.data(), id: d.id } as Operatory))));

        const doctorsCol = collection(db, 'clinics', clinicId, 'doctors');
        const unsubDoctors = onSnapshot(doctorsCol, (snap) => setDoctors(snap.docs.map(d => ({ ...d.data(), id: d.id } as Doctor))));

        const drugsCol = collection(db, 'clinics', clinicId, 'drugs');
        const unsubDrugs = onSnapshot(drugsCol, (snap) => setDrugs(snap.docs.map(d => ({ ...d.data(), id: d.id } as Drug))));

        const proceduresCol = collection(db, 'clinics', clinicId, 'procedures');
        const unsubProcedures = onSnapshot(proceduresCol, (snap) => setProcedures(snap.docs.map(d => ({ ...d.data(), id: d.id } as Procedure))));

        const clinicDoc = doc(db, 'clinics', clinicId);
        const unsubClinic = onSnapshot(clinicDoc, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setActiveDates(data.activeDates || []);
                setIsFounder(data.isFounder || false);
            }
        });

        // Mock lab data for now, can be fetched from firestore later if needed
        setLabs([
            { id: "lab1", name: "Precision Dental Lab", email: "orders@precisionlab.com" },
            { id: "lab2", name: "Aesthetic Creations", email: "contact@aestheticcreations.com" },
            { id: "d1", name: "Modern Dental Supplies", email: "sales@moderndental.com" },
        ]);

        return () => {
            unsubPatients();
            unsubAppointments();
            unsubTransactions();
            unsubOperatories();
            unsubDoctors();
            unsubDrugs();
            unsubProcedures();
            unsubClinic();
        }
    }, [user, db, clinicId]);

    // Fetch founder count to display spots left
    useEffect(() => {
        if (!db) return;
        const q = query(collection(db, 'clinics'), where('isFounder', '==', true));
        getCountFromServer(q).then(snap => {
            setFounderCount(snap.data().count);
        }).catch(console.error);
    }, [db, isFounder]);

    const stats = useMemo(() => {
        const todaysAppointments = appointments.filter(app => isSameDay(new Date(app.date), new Date()));

        const revenueToday = transactions
            .filter(t => t.type === 'Earning' && t.date && isSameDay(new Date(t.date), new Date()))
            .reduce((acc, t) => acc + t.amount, 0);

        const revenueThisMonth = transactions
            .filter(t => t.type === 'Earning' && t.date && isSameMonth(new Date(t.date), new Date()))
            .reduce((acc, t) => acc + t.amount, 0);

        const patientFinancials = patients.map(patient => {
            const baseBillable = patient.linkedProcedures?.reduce((acc, proc) => acc + (proc.cost * (proc.quantity || 1)), 0) || 0;
            let discount = 0;
            if (patient.discountType === 'percentage' && patient.discountValue) {
                discount = (baseBillable * patient.discountValue) / 100;
            } else if (patient.discountType === 'fixed' && patient.discountValue) {
                discount = patient.discountValue;
            }
            const totalBillable = Math.max(0, baseBillable - discount);
            const totalPaid = transactions
                .filter(t => t.patientId === patient.id && t.type === 'Earning')
                .reduce((acc, t) => acc + t.amount, 0);
            return totalBillable - totalPaid;
        });

        const pendingPayments = patientFinancials.reduce((acc, balance) => acc + (balance > 0 ? balance : 0), 0);

        const inChairCount = operatories.filter(op => op.status === 'Occupied').length;

        return {
            inChairCount,
            todaysAppointmentsCount: todaysAppointments.length,
            revenueToday,
            revenueThisMonth,
            pendingPayments
        };
    }, [patients, appointments, transactions, operatories]);

    const patientQueue = useMemo(() => {
        return appointments
            .filter(app => isSameDay(new Date(app.date), new Date()))
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    }, [appointments]);

    const handleStatusChange = async (appointmentId: string, newStatus: Appointment['status']) => {
        if (!clinicId) return;
        try {
            await updateAppointment(clinicId, appointmentId, { status: newStatus });
            toast({
                title: "Status Updated",
                description: `Appointment status is now ${newStatus}.`,
            });
        } catch (error) {
            console.error("Failed to update status", error);
            toast({
                title: "Error",
                description: "Failed to update appointment status. Please try again.",
                variant: "destructive",
            });
        }
    };


    const handleLabSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const contactEmail = formData.get('contactEmail');
        const subject = formData.get('subject');

        if (!contactEmail || !subject) {
            toast({
                title: "Missing fields",
                description: "Please select a lab and enter a subject.",
                variant: "destructive"
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: `Message to Lab Sent (Mock)`,
            description: `Your message to ${contactEmail} has been processed.`
        });
        (e.target as HTMLFormElement).reset();
        setTimeout(() => setIsSubmitting(false), 1000);
    }

    if (clinicLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (!clinicId) {
        return (
            <div className="min-h-[80vh]">
                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-background mb-8">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent dark:from-blue-900/20" />
                    <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 p-8 lg:p-12">
                        {/* Left Content */}
                        <div className="flex flex-col justify-center space-y-6 z-10">
                            <div>
                                <h1 className="leading-tight text-gray-900 dark:text-white">
                                    <span className="block text-lg lg:text-xl font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Welcome to</span>
                                    <span className="text-5xl lg:text-6xl font-extrabold tracking-tight inline-block">
                                        <span style={{ color: '#256AF3' }}>Clinic</span>
                                        <span style={{ color: '#F53D99' }}>@</span>
                                        <span style={{ color: '#256AF3' }}>Click!</span>
                                    </span>
                                </h1>
                                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                                    Let&apos;s set up your clinic so you can start managing patients, appointments, and more – all in one place.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button asChild size="lg" data-tutorial-id="tutorial-add-clinic" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 px-8 py-6 text-base font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                                        <Link href="/clinic?mode=create" className="flex items-center gap-3">
                                            <ClipboardList className="h-5 w-5" />
                                            Add Your Clinic
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" data-tutorial-id="tutorial-join-clinic" className="border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/20 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-8 py-6 text-base font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                                        <Link href="/clinic?mode=join" className="flex items-center gap-3">
                                            <UserPlus className="h-5 w-5" />
                                            Join Clinic
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    You can always update details later
                                </div>
                            </div>
                        </div>

                        {/* Right Illustration */}
                        <div className="hidden lg:flex items-start justify-end">
                            <svg viewBox="0 0 340 260" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-full max-w-xs h-auto drop-shadow-2xl">
                                <rect x="0" y="0" width="340" height="260" rx="16" fill="#F4F3FB"/>

                                <rect x="0" y="0" width="80" height="260" rx="16" fill="#EEEDFE"/>
                                <rect x="64" y="0" width="16" height="260" fill="#EEEDFE"/>

                                <rect x="12" y="20" width="56" height="20" rx="6" fill="#534AB7" opacity="0.12"/>
                                <circle cx="23" cy="30" r="3" fill="#534AB7" opacity="0.5"/>
                                <rect x="30" y="28" width="28" height="4" rx="2" fill="#534AB7" opacity="0.35"/>

                                <rect x="12" y="48" width="56" height="16" rx="5" fill="none"/>
                                <circle cx="23" cy="56" r="3" fill="#7F77DD" opacity="0.5"/>
                                <rect x="30" y="54" width="24" height="3" rx="1.5" fill="#7F77DD" opacity="0.35"/>

                                <rect x="12" y="70" width="56" height="16" rx="5" fill="none"/>
                                <circle cx="23" cy="78" r="3" fill="#7F77DD" opacity="0.4"/>
                                <rect x="30" y="76" width="20" height="3" rx="1.5" fill="#7F77DD" opacity="0.3"/>

                                <rect x="12" y="92" width="56" height="16" rx="5" fill="none"/>
                                <circle cx="23" cy="100" r="3" fill="#7F77DD" opacity="0.4"/>
                                <rect x="30" y="98" width="26" height="3" rx="1.5" fill="#7F77DD" opacity="0.3"/>

                                <rect x="12" y="114" width="56" height="16" rx="5" fill="none"/>
                                <circle cx="23" cy="122" r="3" fill="#7F77DD" opacity="0.4"/>
                                <rect x="30" y="120" width="22" height="3" rx="1.5" fill="#7F77DD" opacity="0.3"/>

                                <rect x="12" y="136" width="56" height="16" rx="5" fill="none"/>
                                <circle cx="23" cy="144" r="3" fill="#7F77DD" opacity="0.4"/>
                                <rect x="30" y="142" width="18" height="3" rx="1.5" fill="#7F77DD" opacity="0.3"/>

                                <rect x="12" y="220" width="56" height="26" rx="8" fill="#E6F1FB" stroke="#B5D4F4" strokeWidth={0.8}/>
                                <circle cx="28" cy="233" r="7" fill="#B5D4F4"/>
                                <rect x="38" y="229" width="22" height="3" rx="1.5" fill="#185FA5" opacity="0.4"/>
                                <rect x="38" y="235" width="16" height="2.5" rx="1.25" fill="#185FA5" opacity="0.25"/>

                                <rect x="88" y="12" width="244" height="236" rx="12" fill="#fff" stroke="#E0DEFA" strokeWidth={0.8}/>

                                <rect x="96" y="20" width="100" height="10" rx="3" fill="#534AB7" opacity="0.15"/>
                                <rect x="96" y="20" width="40" height="10" rx="3" fill="#534AB7" opacity="0.3"/>
                                <rect x="300" y="18" width="24" height="14" rx="5" fill="#378ADD"/>
                                <circle cx="305" cy="25" r="2.5" fill="#fff" opacity="0.9"/>
                                <rect x="311" y="23" width="9" height="2" rx="1" fill="#fff" opacity="0.7"/>
                                <rect x="311" y="27" width="7" height="2" rx="1" fill="#fff" opacity="0.5"/>

                                <rect x="88" y="36" width="244" height="0.5" fill="#E0DEFA"/>

                                <rect x="96" y="44" width="228" height="20" rx="6" fill="#F4F3FB"/>
                                <circle cx="107" cy="54" r="3" fill="#7F77DD" opacity="0.4"/>
                                <rect x="114" y="50" width="50" height="4" rx="2" fill="#2C2C2A" opacity="0.2"/>
                                <circle cx="283" cy="54" r="3" fill="#7F77DD" opacity="0.3"/>
                                <circle cx="293" cy="54" r="3" fill="#7F77DD" opacity="0.3"/>
                                <circle cx="303" cy="54" r="3" fill="#7F77DD" opacity="0.3"/>
                                <rect x="310" y="49" width="10" height="6" rx="3" fill="#E24B4A" opacity="0.4"/>

                                <rect x="88" y="70" width="244" height="0.5" fill="#E0DEFA"/>

                                <rect x="96" y="78" width="70" height="56" rx="8" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth={0.8}/>
                                <rect x="102" y="84" width="30" height="3" rx="1.5" fill="#0F6E56" opacity="0.6"/>
                                <rect x="102" y="90" width="22" height="2.5" rx="1.25" fill="#0F6E56" opacity="0.35"/>
                                <rect x="102" y="95" width="26" height="2.5" rx="1.25" fill="#0F6E56" opacity="0.25"/>
                                <circle cx="155" cy="89" r="7" fill="#1D9E75" opacity="0.2"/>
                                <rect x="151" y="86" width="8" height="6" rx="1.5" fill="#0F6E56" opacity="0.5"/>
                                <rect x="102" y="108" width="58" height="20" rx="5" fill="#fff" stroke="#9FE1CB" strokeWidth={0.8}/>
                                <rect x="108" y="114" width="28" height="3" rx="1.5" fill="#0F6E56" opacity="0.4"/>
                                <rect x="138" y="114" width="14" height="3" rx="1.5" fill="#0F6E56" opacity="0.3"/>

                                <rect x="174" y="78" width="70" height="56" rx="8" fill="#FBEAF0" stroke="#ED93B1" strokeWidth={0.8}/>
                                <rect x="180" y="84" width="30" height="3" rx="1.5" fill="#993556" opacity="0.6"/>
                                <rect x="180" y="90" width="22" height="2.5" rx="1.25" fill="#993556" opacity="0.35"/>
                                <rect x="180" y="95" width="26" height="2.5" rx="1.25" fill="#993556" opacity="0.25"/>
                                <circle cx="233" cy="89" r="7" fill="#D4537E" opacity="0.2"/>
                                <rect x="229" y="86" width="8" height="6" rx="1.5" fill="#993556" opacity="0.5"/>
                                <rect x="180" y="108" width="58" height="20" rx="5" fill="#fff" stroke="#ED93B1" strokeWidth={0.8}/>
                                <rect x="186" y="114" width="28" height="3" rx="1.5" fill="#993556" opacity="0.4"/>
                                <rect x="216" y="114" width="14" height="3" rx="1.5" fill="#993556" opacity="0.3"/>

                                <rect x="252" y="78" width="70" height="56" rx="8" fill="#FAEEDA" stroke="#FAC775" strokeWidth={0.8}/>
                                <rect x="258" y="84" width="30" height="3" rx="1.5" fill="#633806" opacity="0.6"/>
                                <rect x="258" y="90" width="22" height="2.5" rx="1.25" fill="#633806" opacity="0.35"/>
                                <rect x="258" y="95" width="26" height="2.5" rx="1.25" fill="#633806" opacity="0.25"/>
                                <circle cx="311" cy="89" r="7" fill="#EF9F27" opacity="0.2"/>
                                <rect x="307" y="86" width="8" height="6" rx="1.5" fill="#633806" opacity="0.5"/>
                                <rect x="258" y="108" width="58" height="20" rx="5" fill="#fff" stroke="#FAC775" strokeWidth={0.8}/>
                                <rect x="264" y="114" width="28" height="3" rx="1.5" fill="#633806" opacity="0.4"/>
                                <rect x="294" y="114" width="14" height="3" rx="1.5" fill="#633806" opacity="0.3"/>

                                <rect x="88" y="142" width="244" height="0.5" fill="#E0DEFA"/>

                                <rect x="96" y="150" width="228" height="90" rx="8" fill="#F8F8FC"/>

                                <rect x="96" y="150" width="228" height="14" rx="8" fill="#EEEDFE"/>
                                <rect x="96" y="156" width="228" height="8" fill="#EEEDFE"/>

                                <rect x="108" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.5"/>
                                <rect x="135" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="162" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="189" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="216" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="243" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="270" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>
                                <rect x="297" y="153" width="22" height="8" rx="2" fill="#534AB7" opacity="0.2"/>

                                <line x1="96" y1="178" x2="324" y2="178" stroke="#E0DEFA" strokeWidth={0.5}/>
                                <line x1="96" y1="192" x2="324" y2="192" stroke="#E0DEFA" strokeWidth={0.5}/>
                                <line x1="96" y1="206" x2="324" y2="206" stroke="#E0DEFA" strokeWidth={0.5}/>
                                <line x1="96" y1="220" x2="324" y2="220" stroke="#E0DEFA" strokeWidth={0.5}/>

                                <rect x="114" y="168" width="44" height="36" rx="4" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth={0.8}/>
                                <rect x="117" y="172" width="26" height="2.5" rx="1.25" fill="#0F6E56" opacity="0.7"/>
                                <rect x="117" y="177" width="18" height="2" rx="1" fill="#0F6E56" opacity="0.4"/>
                                <rect x="117" y="181" width="22" height="2" rx="1" fill="#0F6E56" opacity="0.3"/>

                                <rect x="163" y="168" width="44" height="24" rx="4" fill="#FBEAF0" stroke="#ED93B1" strokeWidth={0.8}/>
                                <rect x="166" y="172" width="26" height="2.5" rx="1.25" fill="#993556" opacity="0.7"/>
                                <rect x="166" y="177" width="18" height="2" rx="1" fill="#993556" opacity="0.4"/>
                                <rect x="166" y="181" width="22" height="2" rx="1" fill="#993556" opacity="0.3"/>

                                <rect x="212" y="175" width="44" height="36" rx="4" fill="#FAEEDA" stroke="#FAC775" strokeWidth={0.8}/>
                                <rect x="215" y="179" width="26" height="2.5" rx="1.25" fill="#633806" opacity="0.7"/>
                                <rect x="215" y="184" width="18" height="2" rx="1" fill="#633806" opacity="0.4"/>
                                <rect x="215" y="188" width="22" height="2" rx="1" fill="#633806" opacity="0.3"/>

                                <rect x="261" y="168" width="44" height="28" rx="4" fill="#E6F1FB" stroke="#85B7EB" strokeWidth={0.8}/>
                                <rect x="264" y="172" width="26" height="2.5" rx="1.25" fill="#0C447C" opacity="0.7"/>
                                <rect x="264" y="177" width="18" height="2" rx="1" fill="#0C447C" opacity="0.4"/>
                                <rect x="264" y="181" width="22" height="2" rx="1" fill="#0C447C" opacity="0.3"/>

                                <rect x="114" y="210" width="44" height="20" rx="4" fill="#FBEAF0" stroke="#ED93B1" strokeWidth={0.8}/>
                                <rect x="117" y="214" width="26" height="2.5" rx="1.25" fill="#993556" opacity="0.7"/>
                                <rect x="117" y="219" width="18" height="2" rx="1" fill="#993556" opacity="0.4"/>

                                <rect x="212" y="200" width="44" height="20" rx="4" fill="#E1F5EE" stroke="#9FE1CB" strokeWidth={0.8}/>
                                <rect x="215" y="204" width="26" height="2.5" rx="1.25" fill="#0F6E56" opacity="0.7"/>
                                <rect x="215" y="209" width="18" height="2" rx="1" fill="#0F6E56" opacity="0.4"/>

                                <rect x="261" y="206" width="44" height="24" rx="4" fill="#FAEEDA" stroke="#FAC775" strokeWidth={0.8}/>
                                <rect x="264" y="210" width="26" height="2.5" rx="1.25" fill="#633806" opacity="0.7"/>
                                <rect x="264" y="215" width="18" height="2" rx="1" fill="#633806" opacity="0.4"/>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* ── Continue As Section ── */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700" />
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Or continue without a clinic</h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto">

                        {/* Consultant Doctor → pink */}
                        <Link
                            href="/consultation-dashboard"
                            data-tutorial-id="tutorial-consultant"
                            className="group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-card border-2 border-pink-200 dark:border-pink-800/60 shadow-sm hover:shadow-lg hover:shadow-pink-100 dark:hover:shadow-pink-950/30 hover:border-pink-400 dark:hover:border-pink-600 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
                        >
                            {/* glow blob */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-50/60 to-transparent dark:from-pink-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="relative flex items-start gap-4">
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-pink-50 dark:bg-pink-950/50 border border-pink-100 dark:border-pink-800/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <Stethoscope className="h-7 w-7 text-pink-500 dark:text-pink-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-pink-500 dark:text-pink-400 uppercase tracking-wider mb-0.5">Continue as</p>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">Consultant Doctor</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Track consult patients, appointments &amp; earnings — privately in your own account.
                                    </p>
                                </div>
                            </div>

                            <div className="relative mt-5 flex items-center gap-1.5 text-sm font-semibold text-pink-500 dark:text-pink-400 group-hover:gap-3 transition-all duration-200">
                                Go to Consultation Dashboard
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </Link>

                        {/* Student → purple */}
                        <Link
                            href="/academics"
                            data-tutorial-id="tutorial-student"
                            className="group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-card border-2 border-purple-200 dark:border-purple-800/60 shadow-sm hover:shadow-lg hover:shadow-purple-100 dark:hover:shadow-purple-950/30 hover:border-purple-400 dark:hover:border-purple-600 transition-all duration-300 hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
                        >
                            {/* glow blob */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-50/60 to-transparent dark:from-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                            <div className="relative flex items-start gap-4">
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <GraduationCap className="h-7 w-7 text-purple-500 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-wider mb-0.5">Continue as</p>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">Student</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Log case histories, track attendance &amp; manage your academic finances.
                                    </p>
                                </div>
                            </div>

                            <div className="relative mt-5 flex items-center gap-1.5 text-sm font-semibold text-purple-500 dark:text-purple-400 group-hover:gap-3 transition-all duration-200">
                                Go to Academics
                                <ArrowRight className="h-4 w-4" />
                            </div>
                        </Link>

                    </div>
                </div>

                {/* What you can do - Feature Cards */}
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200 dark:to-gray-700" />
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">What you can do</h2>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200 dark:to-gray-700" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
                        {/* Manage Patients */}
                        <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Manage Patients</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keep all patient records organized and secure</p>
                        </div>

                        {/* Billing & Payments */}
                        <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <CreditCard className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Billing & Payments</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create invoices and track payments easily</p>
                        </div>

                        {/* Team Collaboration */}
                        <div className="group flex flex-col items-center text-center p-6 rounded-2xl bg-white dark:bg-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <UserPlus className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Team Collaboration</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add your team and work together seamlessly</p>
                        </div>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="rounded-2xl bg-gray-50/80 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                </svg>
                            </div>
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Your data is safe with us</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Secure & Encrypted</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Always Backed Up</span>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center flex-shrink-0">
                                <svg className="h-5 w-5 text-teal-600 dark:text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>
                            <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">Privacy First</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const activeDaysCount = activeDates.length;
    const patientsCount = patients.length;
    const doctorsCount = doctors.filter(d => d.doctorType === 'activedoctor').length;

    let founderTier: 'None' | 'Bronze' | 'Silver' | 'Gold' = 'None';
    let nextTier: 'Bronze' | 'Silver' | 'Gold' | 'None' = 'Bronze';
    
    const qualifiesGold = activeDaysCount >= 60 && patientsCount >= 30 && doctorsCount >= 2;
    const qualifiesSilver = activeDaysCount >= 30 && patientsCount >= 20 && doctorsCount >= 2;
    const qualifiesBronze = activeDaysCount >= 10 && patientsCount >= 10 && doctorsCount >= 1;

    if (isFounder) {
        if (qualifiesGold) {
            founderTier = 'Gold';
            nextTier = 'None';
        } else if (qualifiesSilver) {
            founderTier = 'Silver';
            nextTier = 'Gold';
        } else {
            founderTier = 'Bronze';
            nextTier = 'Silver';
        }
    } else {
        founderTier = 'None';
        nextTier = founderCount < 100 ? 'Bronze' : 'None';
    }

    const getTierDetails = (tier: string) => {
        switch (tier) {
            case 'Bronze': return { days: 10, patients: 10, doctors: 1, discount: 25, color: 'text-amber-700 bg-amber-100', iconColor: '#b45309', label: 'Bronze Founder' };
            case 'Silver': return { days: 30, patients: 20, doctors: 2, discount: 50, color: 'text-slate-700 bg-slate-200', iconColor: '#94a3b8', label: 'Silver Founder' };
            case 'Gold': return { days: 60, patients: 30, doctors: 2, discount: 75, color: 'text-yellow-700 bg-yellow-100', iconColor: '#eab308', label: 'Gold Founder' };
            default: return { days: 10, patients: 10, doctors: 1, discount: 0, color: 'text-slate-500 bg-slate-100', iconColor: '#94a3b8', label: 'Founder Program' };
        }
    };

    const currentTierInfo = getTierDetails(founderTier);
    const nextTierInfo = getTierDetails(nextTier);

    return (
        <div className="space-y-6">

            {SHOW_FOUNDER_PROGRAM && (
                <>
                    {/* FOUNDER PROGRAM BANNER / HEADLINE */}
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-3.5 py-2 rounded-full border border-emerald-500/25 w-fit cursor-pointer transition-all hover:scale-[1.01]" onClick={() => setIsFounderDialogOpen(true)}>
                        <Medal className="h-4 w-4 text-emerald-500 animate-pulse" />
                        <span>Learn more about the founder program.</span>
                    </div>

                    <Dialog open={isFounderDialogOpen} onOpenChange={setIsFounderDialogOpen}>
                        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] p-0 overflow-hidden flex flex-col bg-[#FAFAFA] dark:bg-[#1A1A1A] border-0 rounded-2xl shadow-xl">
                            <DialogHeader className="sr-only">
                                <DialogTitle>Founder Program</DialogTitle>
                                <DialogDescription>Founder program tier and benefits</DialogDescription>
                            </DialogHeader>
                            <div className="p-6 bg-white dark:bg-[#252525] flex items-center gap-4 border-b border-slate-100 dark:border-[#333] shrink-0">
                                <div className="h-12 w-12 rounded-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30">
                                    <Medal className="h-6 w-6 text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {founderTier !== 'None' ? currentTierInfo.label : 'Founder Program'}
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-[#A0A0A0]">
                                        {founderTier !== 'None' ? "You're among the earliest clinics on Clinic@Click." : "Complete requirements to unlock premium benefits."}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6 space-y-8 overflow-y-auto flex-1">
                                {/* Description */}
                                <div className="text-sm text-slate-600 dark:text-[#B0B0B0] space-y-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                                    <p className="font-bold text-slate-900 dark:text-white">Founder Program</p>
                                    <p>Clinic@Click is currently free while we continue building the platform.</p>
                                    <p>As premium plans are introduced in the future, Founder Clinics will receive exclusive discounts based on their Founder Tier.</p>
                                    <p>Clinic@Click will always offer a free plan with essential clinic management features. Premium plans will focus on advanced automation, AI tools, analytics, reporting, and productivity features.</p>
                                </div>

                                {/* Current Benefit */}
                                <div>
                                    <h3 className="text-xs font-bold tracking-widest text-slate-400 dark:text-[#888] uppercase mb-3">Current Benefit</h3>
                                    <div className="bg-[#FFF4E5] dark:bg-[#3D2C1D] border border-[#FDE0B6] dark:border-[#5C4328] rounded-xl p-4 flex items-start gap-4">
                                        <Tag className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                        <div>
                                            <div className="font-bold text-amber-900 dark:text-amber-100 text-base">
                                                {founderTier !== 'None' ? `${currentTierInfo.discount}% off future premium plans` : 'No benefits unlocked yet'}
                                            </div>
                                            <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                                {founderTier !== 'None' ? 'Locked in for as long as you stay a founder.' : 'Reach Bronze tier to get 25% off.'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress to Next Tier */}
                                {nextTier !== 'None' && (
                                    <div>
                                        <h3 className="text-xs font-bold tracking-widest text-slate-400 dark:text-[#888] uppercase mb-4">Progress to {nextTier}</h3>
                                        <div className="space-y-5">
                                            {/* Active Days */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-[#D0D0D0]">
                                                        <Calendar className="h-4 w-4 text-slate-400" /> Maintain an active clinic
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 dark:text-[#A0A0A0]">
                                                        {activeDaysCount} / {nextTierInfo.days} days
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 dark:bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (activeDaysCount / nextTierInfo.days) * 100)}%` }}></div>
                                                </div>
                                                <div className="text-xs text-right mt-1 text-slate-400 dark:text-[#888]">
                                                    {Math.max(0, nextTierInfo.days - activeDaysCount)} days left
                                                </div>
                                            </div>

                                            {/* Patients */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-[#D0D0D0]">
                                                        <Users className="h-4 w-4 text-slate-400" /> Grow patient records
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 dark:text-[#A0A0A0]">
                                                        {patientsCount} / {nextTierInfo.patients}
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 dark:bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (patientsCount / nextTierInfo.patients) * 100)}%` }}></div>
                                                </div>
                                                <div className="text-xs text-right mt-1 text-slate-400 dark:text-[#888]">
                                                    {Math.max(0, nextTierInfo.patients - patientsCount)} more
                                                </div>
                                            </div>

                                            {/* Doctors */}
                                            <div>
                                                <div className="flex justify-between items-center mb-2">
                                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-[#D0D0D0]">
                                                        <UserCheck className="h-4 w-4 text-slate-400" /> Collaborate with doctors
                                                    </div>
                                                    <div className="text-sm font-medium text-slate-500 dark:text-[#A0A0A0]">
                                                        {doctorsCount} / {nextTierInfo.doctors}
                                                    </div>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 dark:bg-[#333] rounded-full overflow-hidden">
                                                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (doctorsCount / nextTierInfo.doctors) * 100)}%` }}></div>
                                                </div>
                                                <div className="flex justify-between items-start mt-1">
                                                    <details className="text-xs group">
                                                        <summary className="text-blue-500 cursor-pointer font-medium hover:underline list-none flex items-center">
                                                            <svg className="w-3 h-3 mr-1 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                                                            How to add a doctor?
                                                        </summary>
                                                        <div className="mt-2 bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 leading-relaxed text-left">
                                                            <ol className="list-decimal pl-4 space-y-1">
                                                                <li>Share your clinic's invite code with your associate doctor.</li>
                                                                <li>Ask them to visit <strong>clinicatclick.com</strong> or download the app.</li>
                                                                <li>They should sign up, go to "Join Clinic", enter your code, and select the <strong>Doctor</strong> role.</li>
                                                                <li>Approve their request in the pending requests section.</li>
                                                            </ol>
                                                        </div>
                                                    </details>
                                                    <div className="text-xs text-right text-slate-400 dark:text-[#888] whitespace-nowrap ml-4">
                                                        {Math.max(0, nextTierInfo.doctors - doctorsCount)} more
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* All Founder Tiers */}
                                <div>
                                    <h3 className="text-xs font-bold tracking-widest text-slate-400 dark:text-[#888] uppercase mb-4">All Founder Tiers</h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { name: 'Bronze', days: 10, patients: 10, doctors: 1, discount: 25, achieved: founderTier === 'Bronze' || founderTier === 'Silver' || founderTier === 'Gold', current: founderTier === 'Bronze' },
                                            { name: 'Silver', days: 30, patients: 20, doctors: 2, discount: 50, achieved: founderTier === 'Silver' || founderTier === 'Gold', current: founderTier === 'Silver' },
                                            { name: 'Gold', days: 60, patients: 30, doctors: 2, discount: 75, achieved: founderTier === 'Gold', current: founderTier === 'Gold' }
                                        ].map(t => (
                                            <div key={t.name} className={`rounded-xl p-4 border ${t.current ? 'bg-[#FFF9F0] border-amber-400 dark:bg-[#332A1F] dark:border-amber-600' : 'bg-white border-slate-200 dark:bg-[#252525] dark:border-[#333]'} relative overflow-hidden flex flex-col justify-between h-full`}>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Medal className={`h-5 w-5 ${t.name === 'Bronze' ? 'text-amber-700' : t.name === 'Silver' ? 'text-slate-400' : 'text-yellow-500'}`} />
                                                        <span className="font-bold text-sm text-slate-900 dark:text-white">{t.name}</span>
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-[#A0A0A0] space-y-1 mb-4">
                                                        <div>{t.days} days active</div>
                                                        <div>{t.patients} patient records</div>
                                                        <div>{t.doctors} doctors</div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${t.current ? 'bg-amber-500 text-white' : t.achieved ? 'bg-slate-100 text-slate-600 dark:bg-[#333] dark:text-[#C0C0C0]' : 'bg-slate-50 text-slate-400 border border-slate-200 dark:bg-[#1A1A1A] dark:border-[#333]'}`}>
                                                        {t.discount}% off
                                                    </span>
                                                    <div className="mt-2 text-[10px] font-bold">
                                                        {t.current ? <span className="text-amber-600 dark:text-amber-500 flex items-center gap-1">← Current</span> : t.achieved ? <span className="text-slate-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Achieved</span> : <span className="text-slate-300 dark:text-[#666]">In progress</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-slate-50 dark:bg-[#1A1A1A] border border-slate-200 dark:border-[#333] rounded-lg text-center text-xs text-slate-500 dark:text-[#A0A0A0]">
                                        {(() => {
                                            const displayFounderCount = Math.min(100, Math.round(25 + founderCount * 0.75));
                                            if (founderCount >= 100 && !isFounder) {
                                                return "100 clinics have already joined the Founder Program. New founder spots are currently closed.";
                                            }
                                            if (isFounder) {
                                                return "You are part of the exclusive first 100 Founder Clinics!";
                                            }
                                            return `Only the first 100 clinics to reach Bronze will be a part of the Founder Program. (${displayFounderCount}/100 spots claimed)`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            )}

            {/* GREETING & STATS */}
            <div>
                <h1 className="text-2xl font-semibold">{greeting || 'Welcome!'}</h1>
                <p className="text-gray-500">{format(new Date(), "dd/MM/yyyy")}</p>

                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <StatCard title="In Chair" value={String(stats.inChairCount)} icon={<Stethoscope className="text-blue-500" />} highlight />
                    <StatCard title="Today's Appointments" value={String(stats.todaysAppointmentsCount)} icon={<Calendar className="text-purple-500" />} />
                    <StatCard title="Revenue Today" value={`₹${stats.revenueToday.toLocaleString()}`} icon={<IndianRupee className="text-green-500" />} success />
                    <StatCard title="Pending Payments" value={`₹${stats.pendingPayments.toLocaleString()}`} icon={<Wallet className="text-red-500" />} danger />
                </div>
            </div>

            {/* MAIN GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* PATIENT QUEUE */}
                <div className="lg:col-span-2 bg-white dark:bg-card rounded-xl shadow-sm p-5 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Patient Queue</h2>
                            <Button 
                                size="sm" 
                                onClick={() => setIsAppointmentOpen(true)}
                                className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-xs text-xs font-medium cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Appointment
                            </Button>
                        </div>

                        {patientQueue.length > 0 ? (
                            <div className="divide-y divide-border/60">
                                {patientQueue.map(app => (
                                    <QueueItem
                                        key={app.id}
                                        time={app.startTime}
                                        name={app.patientName || "Unknown"}
                                        procedure={app.notes || (app.procedureIds && app.procedureIds.length > 0 ? `${app.procedureIds.length} procedure(s)` : 'General Consultation')}
                                        status={app.status}
                                        onStatusChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 px-4 text-center rounded-xl border border-dashed border-border/80 bg-muted/20 my-2 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                                    <CalendarPlus className="h-6 w-6" />
                                </div>
                                <h3 className="font-semibold text-sm text-foreground mb-1">No appointments scheduled for today</h3>
                                <p className="text-muted-foreground text-xs max-w-sm mb-4">
                                    Get started by scheduling an appointment directly into today&apos;s schedule.
                                </p>
                                <Button 
                                    onClick={() => setIsAppointmentOpen(true)} 
                                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 text-xs font-medium cursor-pointer"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Appointment
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="pt-3 border-t border-border/40 mt-3 flex items-center justify-between">
                        <Button variant="link" asChild className="text-blue-600 dark:text-blue-400 text-sm p-0 h-auto hover:underline font-medium">
                            <Link href="/appointments">View Calendar →</Link>
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {patientQueue.length} patient{patientQueue.length === 1 ? '' : 's'} in queue
                        </span>
                    </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5 space-y-3">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>

                    {/* 1. New Patient - Emerald / Green (Opens Patient Dialog) */}
                    <ActionButton 
                        onClick={() => setIsNewPatientOpen(true)}
                        icon={<UserPlus className="h-5 w-5 text-emerald-500 shrink-0" />} 
                        label="New Patient" 
                        className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 cursor-pointer"
                    />

                    {/* 2. Create Appointment - Sky / Blue (Opens Full Appointment Dialog) */}
                    <ActionButton 
                        onClick={() => setIsAppointmentOpen(true)} 
                        icon={<CalendarPlus className="h-5 w-5 text-sky-500 shrink-0" />} 
                        label="Schedule Appointment" 
                        className="bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/20 hover:border-sky-500/50 cursor-pointer"
                    />

                    {/* 3. Generate Invoice / Record Transaction - Amber / Orange (Opens Transaction Dialog) */}
                    <ActionButton 
                        onClick={() => setIsTransactionOpen(true)}
                        icon={<Receipt className="h-5 w-5 text-amber-500 shrink-0" />} 
                        label="Generate Invoice" 
                        className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:border-amber-500/50 cursor-pointer"
                    />

                    {/* 4. Write Prescription - Rose / Red (Opens Prescription Dialog) */}
                    <ActionButton 
                        onClick={() => setIsPrescriptionOpen(true)}
                        icon={<ClipboardList className="h-5 w-5 text-rose-500 shrink-0" />} 
                        label="Write Prescription" 
                        className="bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 cursor-pointer"
                    />
                </div>

                {/* 1. NEW PATIENT DIALOG */}
                <Dialog open={isNewPatientOpen} onOpenChange={setIsNewPatientOpen}>
                    <DialogContent className="w-[calc(100%-1.25rem)] max-w-xl max-h-[90vh] rounded-2xl p-4 sm:p-6 shadow-2xl border border-border flex flex-col gap-0 overflow-hidden">
                        <DialogHeader className="pb-3 border-b shrink-0">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-emerald-500" />
                                Add New Patient
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Register a new patient record into your clinic.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreatePatient} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ptFirstName" className="text-xs font-medium">First Name *</Label>
                                        <Input 
                                            id="ptFirstName" 
                                            value={patientForm.firstName} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, firstName: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs" 
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ptLastName" className="text-xs font-medium">Last Name *</Label>
                                        <Input 
                                            id="ptLastName" 
                                            value={patientForm.lastName} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, lastName: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs" 
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ptContact" className="text-xs font-medium">Contact Number *</Label>
                                        <Input 
                                            id="ptContact" 
                                            value={patientForm.contactNumber} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, contactNumber: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs" 
                                            placeholder="9876543210"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ptGender" className="text-xs font-medium">Gender</Label>
                                        <Select 
                                            value={patientForm.gender} 
                                            onValueChange={(val: Patient['gender']) => setPatientForm(p => ({ ...p, gender: val }))}
                                        >
                                            <SelectTrigger id="ptGender" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Male" className="text-xs">Male</SelectItem>
                                                <SelectItem value="Female" className="text-xs">Female</SelectItem>
                                                <SelectItem value="Other" className="text-xs">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ptDob" className="text-xs font-medium">Date of Birth</Label>
                                        <Input 
                                            id="ptDob" 
                                            type="date" 
                                            value={patientForm.dateOfBirth} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, dateOfBirth: e.target.value }))} 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ptEmail" className="text-xs font-medium">Email (Optional)</Label>
                                        <Input 
                                            id="ptEmail" 
                                            type="email" 
                                            value={patientForm.email} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, email: e.target.value }))} 
                                            className="h-9 text-xs" 
                                            placeholder="patient@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="ptAddress" className="text-xs font-medium">Address (Optional)</Label>
                                    <Input 
                                        id="ptAddress" 
                                        value={patientForm.address} 
                                        onChange={(e) => setPatientForm(p => ({ ...p, address: e.target.value }))} 
                                        className="h-9 text-xs" 
                                        placeholder="Street, City"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="ptAllergies" className="text-xs font-medium">Allergies</Label>
                                        <Input 
                                            id="ptAllergies" 
                                            value={patientForm.allergies} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, allergies: e.target.value }))} 
                                            className="h-9 text-xs" 
                                            placeholder="e.g. Penicillin, Latex"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="ptMedHistory" className="text-xs font-medium">Medical History</Label>
                                        <Input 
                                            id="ptMedHistory" 
                                            value={patientForm.medicalHistory} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, medicalHistory: e.target.value }))} 
                                            className="h-9 text-xs" 
                                            placeholder="e.g. Diabetes, Hypertension"
                                        />
                                    </div>
                                </div>

                                <div className="pt-1 flex items-center space-x-2">
                                    <Checkbox 
                                        id="ptIsConsult" 
                                        checked={patientForm.isConsult} 
                                        onCheckedChange={(checked) => setPatientForm(p => ({ ...p, isConsult: !!checked }))}
                                    />
                                    <Label htmlFor="ptIsConsult" className="text-xs font-medium cursor-pointer">
                                        This is an external consultation patient
                                    </Label>
                                </div>

                                {patientForm.isConsult && (
                                    <div className="space-y-1 pl-6">
                                        <Label htmlFor="ptConsultLoc" className="text-xs font-medium">Consult Location / Clinic Name</Label>
                                        <Input 
                                            id="ptConsultLoc" 
                                            value={patientForm.consultLocation} 
                                            onChange={(e) => setPatientForm(p => ({ ...p, consultLocation: e.target.value }))} 
                                            className="h-9 text-xs" 
                                            placeholder="e.g. City Dental Hospital"
                                        />
                                    </div>
                                )}
                            </div>

                            <DialogFooter className="pt-3 border-t shrink-0 flex flex-row justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsNewPatientOpen(false)} className="h-9 text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={modalSubmitting} className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                                    {modalSubmitting ? 'Saving...' : 'Save Patient'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 2. FULL APPOINTMENT DIALOG (matches /appointments) */}
                <Dialog open={isAppointmentOpen} onOpenChange={setIsAppointmentOpen}>
                    <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg max-h-[90vh] rounded-2xl p-4 sm:p-6 shadow-2xl border border-border flex flex-col gap-0 overflow-hidden">
                        <DialogHeader className="pb-3 border-b shrink-0">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <CalendarPlus className="h-5 w-5 text-sky-500" />
                                Schedule Appointment
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Set up patient appointment details, procedure linkages, and schedule.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateAppointment} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                                <div className="space-y-1">
                                    <Label htmlFor="appPatient" className="text-xs font-medium">Patient *</Label>
                                    <Select 
                                        value={appointmentForm.patientId} 
                                        onValueChange={(val) => setAppointmentForm(p => ({ ...p, patientId: val }))}
                                        required
                                    >
                                        <SelectTrigger id="appPatient" className="h-9 text-xs">
                                            <SelectValue placeholder="Select Patient" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {patients.length === 0 ? (
                                                <div className="p-3 text-xs text-muted-foreground text-center">No patients found. Add a patient first.</div>
                                            ) : (
                                                patients.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                                                        {p.firstName} {p.lastName} {p.isConsult ? '(Consult)' : ''}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="appDoctor" className="text-xs font-medium">Doctor *</Label>
                                    <Select 
                                        value={appointmentForm.doctorId} 
                                        onValueChange={(val) => setAppointmentForm(p => ({ ...p, doctorId: val }))}
                                        required
                                    >
                                        <SelectTrigger id="appDoctor" className="h-9 text-xs">
                                            <SelectValue placeholder="Select Doctor" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-56">
                                            {doctors.length === 0 ? (
                                                <div className="p-3 text-xs text-muted-foreground text-center">No doctors registered yet.</div>
                                            ) : (
                                                doctors.map(d => (
                                                    <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                                                        {d.name} {d.specialization ? `• ${d.specialization}` : ''}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="appDate" className="text-xs font-medium">Date *</Label>
                                        <Input 
                                            id="appDate" 
                                            type="date" 
                                            value={appointmentForm.date} 
                                            onChange={(e) => setAppointmentForm(p => ({ ...p, date: e.target.value }))}
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="appStatus" className="text-xs font-medium">Status *</Label>
                                        <Select 
                                            value={appointmentForm.status} 
                                            onValueChange={(val: Appointment['status']) => setAppointmentForm(p => ({ ...p, status: val }))}
                                            required
                                        >
                                            <SelectTrigger id="appStatus" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(['Scheduled', 'Confirmed', 'Completed', 'Cancelled', 'Missed', 'Postponed'] as Appointment['status'][]).map(s => (
                                                    <SelectItem key={s} value={s} className="text-xs cursor-pointer">{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="appStartTime" className="text-xs font-medium">Start Time *</Label>
                                        <Input 
                                            id="appStartTime" 
                                            type="time" 
                                            value={appointmentForm.startTime} 
                                            onChange={(e) => setAppointmentForm(p => ({ ...p, startTime: e.target.value }))}
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="appEndTime" className="text-xs font-medium">End Time *</Label>
                                        <Input 
                                            id="appEndTime" 
                                            type="time" 
                                            value={appointmentForm.endTime} 
                                            onChange={(e) => setAppointmentForm(p => ({ ...p, endTime: e.target.value }))}
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                </div>

                                <div className="pt-1 flex items-center space-x-2">
                                    <Checkbox 
                                        id="appIsConsult" 
                                        checked={appointmentForm.isConsult} 
                                        onCheckedChange={(checked) => setAppointmentForm(p => ({ ...p, isConsult: !!checked }))}
                                    />
                                    <Label htmlFor="appIsConsult" className="text-xs font-medium cursor-pointer">
                                        This is a consultation appointment
                                    </Label>
                                </div>

                                {appointmentForm.isConsult && (
                                    <div className="space-y-1 pl-6">
                                        <Label htmlFor="appConsultLoc" className="text-xs font-medium">Consult Location / Clinic Name</Label>
                                        <Input 
                                            id="appConsultLoc" 
                                            value={appointmentForm.consultLocation} 
                                            onChange={(e) => setAppointmentForm(p => ({ ...p, consultLocation: e.target.value }))} 
                                            className="h-9 text-xs" 
                                            placeholder="e.g. City General Hospital"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label className="text-xs font-medium">Linked Procedures</Label>
                                    <div className="border rounded-md p-2 space-y-1 max-h-32 overflow-y-auto bg-muted/20">
                                        {procedures.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No procedures registered in clinic.</p>
                                        ) : (
                                            procedures.map(proc => (
                                                <div key={proc.id} className="flex items-center space-x-2 py-0.5">
                                                    <Checkbox 
                                                        checked={(appointmentForm.procedureIds || []).includes(proc.id)} 
                                                        onCheckedChange={() => setAppointmentForm(prev => {
                                                            const prevIds = prev.procedureIds || [];
                                                            return {
                                                                ...prev,
                                                                procedureIds: prevIds.includes(proc.id) ? prevIds.filter(id => id !== proc.id) : [...prevIds, proc.id]
                                                            };
                                                        })} 
                                                    />
                                                    <span className="text-xs">{proc.name}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="appNotes" className="text-xs font-medium">Additional Notes (Optional)</Label>
                                    <Textarea 
                                        id="appNotes" 
                                        value={appointmentForm.notes} 
                                        onChange={(e) => setAppointmentForm(p => ({ ...p, notes: e.target.value }))} 
                                        placeholder="Any specific clinical notes, teeth to observe, or instructions." 
                                        className="min-h-[50px] text-xs py-1.5" 
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-3 border-t shrink-0 flex flex-row justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsAppointmentOpen(false)} className="h-9 text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={modalSubmitting} className="h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white">
                                    {modalSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 3. GENERATE INVOICE / TRANSACTION DIALOG (matches /financials) */}
                <Dialog open={isTransactionOpen} onOpenChange={setIsTransactionOpen}>
                    <DialogContent className="w-[calc(100%-1.25rem)] max-w-lg max-h-[90vh] rounded-2xl p-4 sm:p-6 shadow-2xl border border-border flex flex-col gap-0 overflow-hidden">
                        <DialogHeader className="pb-3 border-b shrink-0">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-amber-500" />
                                Record Transaction / Invoice
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Record a financial earning, invoice entry, or expense for the clinic.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateTransaction} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="txDate" className="text-xs font-medium">Transaction Date *</Label>
                                        <Input 
                                            id="txDate" 
                                            type="date" 
                                            value={transactionForm.date} 
                                            onChange={(e) => setTransactionForm(t => ({ ...t, date: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="txPayDate" className="text-xs font-medium">Payment Date *</Label>
                                        <Input 
                                            id="txPayDate" 
                                            type="date" 
                                            value={transactionForm.paymentDate} 
                                            onChange={(e) => setTransactionForm(t => ({ ...t, paymentDate: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="txType" className="text-xs font-medium">Type *</Label>
                                        <Select 
                                            value={transactionForm.type} 
                                            onValueChange={(val: TransactionType) => setTransactionForm(t => ({ ...t, type: val }))}
                                            required
                                        >
                                            <SelectTrigger id="txType" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Earning" className="text-xs">Earning</SelectItem>
                                                <SelectItem value="Expense" className="text-xs">Expense</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="txMethod" className="text-xs font-medium">Payment Method *</Label>
                                        <Select 
                                            value={transactionForm.paymentMethod} 
                                            onValueChange={(val: PaymentMethod) => setTransactionForm(t => ({ ...t, paymentMethod: val }))}
                                            required
                                        >
                                            <SelectTrigger id="txMethod" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'] as PaymentMethod[]).map(m => (
                                                    <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="txCategory" className="text-xs font-medium">Category *</Label>
                                        <Select 
                                            value={transactionForm.category} 
                                            onValueChange={(val: TransactionCategory) => setTransactionForm(t => ({ ...t, category: val }))}
                                            required
                                        >
                                            <SelectTrigger id="txCategory" className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {transactionForm.type === 'Earning' ? (
                                                    <>
                                                        <SelectItem value="Consultation Fee" className="text-xs">Consultation Fee</SelectItem>
                                                        <SelectItem value="Procedure Payment" className="text-xs">Procedure Payment</SelectItem>
                                                        <SelectItem value="Miscellaneous Income" className="text-xs">Miscellaneous Income</SelectItem>
                                                    </>
                                                ) : (
                                                    <>
                                                        <SelectItem value="Lab Charges" className="text-xs">Lab Charges</SelectItem>
                                                        <SelectItem value="Supplies (Dental)" className="text-xs">Supplies (Dental)</SelectItem>
                                                        <SelectItem value="Rent" className="text-xs">Rent</SelectItem>
                                                        <SelectItem value="Salaries" className="text-xs">Salaries</SelectItem>
                                                        <SelectItem value="Utilities" className="text-xs">Utilities</SelectItem>
                                                        <SelectItem value="Miscellaneous Expense" className="text-xs">Miscellaneous Expense</SelectItem>
                                                    </>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="txAmount" className="text-xs font-medium">Amount (₹) *</Label>
                                        <Input 
                                            id="txAmount" 
                                            type="number" 
                                            min="1" 
                                            step="0.01" 
                                            value={transactionForm.amount} 
                                            onChange={(e) => setTransactionForm(t => ({ ...t, amount: e.target.value }))} 
                                            required 
                                            className="h-9 text-xs font-semibold" 
                                            placeholder="500" 
                                        />
                                    </div>
                                </div>

                                {transactionForm.type === 'Earning' && (
                                    <div className="space-y-1">
                                        <Label htmlFor="txPatient" className="text-xs font-medium">Patient (Optional)</Label>
                                        <Select 
                                            value={transactionForm.patientId} 
                                            onValueChange={(val) => setTransactionForm(t => ({ ...t, patientId: val }))}
                                        >
                                            <SelectTrigger id="txPatient" className="h-9 text-xs">
                                                <SelectValue placeholder="Select Patient (if applicable)" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                {patients.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                                                        {p.firstName} {p.lastName} {p.isConsult ? '(Consult)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <Label htmlFor="txDescription" className="text-xs font-medium">Description (Optional)</Label>
                                    <Textarea 
                                        id="txDescription" 
                                        value={transactionForm.description} 
                                        onChange={(e) => setTransactionForm(t => ({ ...t, description: e.target.value }))} 
                                        placeholder="Invoice details, payment reference or notes." 
                                        className="min-h-[50px] text-xs py-1.5" 
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-3 border-t shrink-0 flex flex-row justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsTransactionOpen(false)} className="h-9 text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={modalSubmitting} className="h-9 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                                    {modalSubmitting ? 'Recording...' : 'Record Transaction'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* 4. WRITE PRESCRIPTION DIALOG (matches /pharmacy) */}
                <Dialog open={isPrescriptionOpen} onOpenChange={setIsPrescriptionOpen}>
                    <DialogContent className="w-[calc(100%-1.25rem)] max-w-2xl max-h-[92vh] rounded-2xl p-4 sm:p-6 shadow-2xl border border-border flex flex-col gap-0 overflow-hidden">
                        <DialogHeader className="pb-3 border-b shrink-0">
                            <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-rose-500" />
                                Write New Prescription
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Prescribe medications with dosage, frequency, and instructions.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreatePrescription} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label htmlFor="rxPatient" className="text-xs font-medium">Patient *</Label>
                                        <Select 
                                            value={prescriptionForm.patientId} 
                                            onValueChange={(val) => setPrescriptionForm(p => ({ ...p, patientId: val }))}
                                            required
                                        >
                                            <SelectTrigger id="rxPatient" className="h-9 text-xs">
                                                <SelectValue placeholder="Select Patient" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                {patients.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="text-xs cursor-pointer">
                                                        {p.firstName} {p.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="rxDoctor" className="text-xs font-medium">Doctor *</Label>
                                        <Select 
                                            value={prescriptionForm.doctorId} 
                                            onValueChange={(val) => setPrescriptionForm(p => ({ ...p, doctorId: val }))}
                                            required
                                        >
                                            <SelectTrigger id="rxDoctor" className="h-9 text-xs">
                                                <SelectValue placeholder="Select Doctor" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                {doctors.map(d => (
                                                    <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                                                        {d.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="rxDate" className="text-xs font-medium">Date *</Label>
                                        <Input 
                                            id="rxDate" 
                                            type="date" 
                                            value={prescriptionForm.date} 
                                            onChange={(e) => setPrescriptionForm(p => ({ ...p, date: e.target.value }))}
                                            required 
                                            className="h-9 text-xs" 
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-foreground">Medications</Label>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={addPrescriptionItemRow} 
                                            className="h-7 text-xs gap-1"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add Drug
                                        </Button>
                                    </div>

                                    {prescriptionForm.items.map((item, idx) => (
                                        <div key={idx} className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">Medication #{idx + 1}</span>
                                                {prescriptionForm.items.length > 1 && (
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => removePrescriptionItemRow(idx)}
                                                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                <div className="space-y-1">
                                                    <Label className="text-2xs font-medium">Drug *</Label>
                                                    <Select 
                                                        value={item.drugId} 
                                                        onValueChange={(val) => handlePrescriptionItemChange(idx, 'drugId', val)}
                                                        required
                                                    >
                                                        <SelectTrigger className="h-8 text-xs">
                                                            <SelectValue placeholder="Select Drug" />
                                                        </SelectTrigger>
                                                        <SelectContent className="max-h-56">
                                                            {drugs.length === 0 ? (
                                                                <div className="p-2 text-xs text-muted-foreground">No drugs found in pharmacy inventory.</div>
                                                            ) : (
                                                                drugs.map(d => (
                                                                    <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                                                                        {d.genericName} ({d.brandName || 'Generic'}) {d.strength ? `- ${d.strength}` : ''}
                                                                    </SelectItem>
                                                                ))
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-2xs font-medium">Dosage *</Label>
                                                    <Input 
                                                        value={item.dosage} 
                                                        onChange={(e) => handlePrescriptionItemChange(idx, 'dosage', e.target.value)} 
                                                        required 
                                                        className="h-8 text-xs" 
                                                        placeholder="e.g. 1 Tab, 5ml"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                <div className="space-y-1">
                                                    <Label className="text-2xs font-medium">Frequency *</Label>
                                                    <Input 
                                                        value={item.frequency} 
                                                        onChange={(e) => handlePrescriptionItemChange(idx, 'frequency', e.target.value)} 
                                                        required 
                                                        className="h-8 text-xs" 
                                                        placeholder="e.g. BD, TDS, SOS"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-2xs font-medium">Duration *</Label>
                                                    <Input 
                                                        value={item.duration} 
                                                        onChange={(e) => handlePrescriptionItemChange(idx, 'duration', e.target.value)} 
                                                        required 
                                                        className="h-8 text-xs" 
                                                        placeholder="e.g. 5 Days"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-2xs font-medium">Instructions (Optional)</Label>
                                                <Input 
                                                    value={item.notes || ''} 
                                                    onChange={(e) => handlePrescriptionItemChange(idx, 'notes', e.target.value)} 
                                                    className="h-8 text-xs" 
                                                    placeholder="e.g. After food, take with water"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="rxNotes" className="text-xs font-medium">Overall Prescription Notes (Optional)</Label>
                                    <Textarea 
                                        id="rxNotes" 
                                        value={prescriptionForm.notes} 
                                        onChange={(e) => setPrescriptionForm(p => ({ ...p, notes: e.target.value }))} 
                                        placeholder="e.g. Review after 3 days. Drink plenty of water." 
                                        className="min-h-[50px] text-xs py-1.5" 
                                    />
                                </div>
                            </div>

                            <DialogFooter className="pt-3 border-t shrink-0 flex flex-row justify-end gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsPrescriptionOpen(false)} className="h-9 text-xs">
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={modalSubmitting} className="h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white">
                                    {modalSubmitting ? 'Saving...' : 'Generate Prescription'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* BOTTOM GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* DENTAL LAB COMMUNICATION */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Beaker className="text-cyan-500" />
                        Dental Lab Communication
                    </h2>
                    <form onSubmit={handleLabSubmit} className="mt-4 space-y-3 text-sm">
                        <div>
                            <Label htmlFor="labSelect">Select Lab</Label>
                            <Select name="contactEmail" required disabled={isSubmitting}>
                                <SelectTrigger id="labSelect"><SelectValue placeholder="Select a lab..." /></SelectTrigger>
                                <SelectContent>{labs.map(l => <SelectItem key={l.id} value={l.email}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="labSubject">Subject</Label>
                            <Input id="labSubject" name="subject" placeholder="e.g., Case #1234 - PFM Crown" required disabled={isSubmitting} />
                        </div>
                        <div>
                            <Label htmlFor="labMessage">Message</Label>
                            <Textarea id="labMessage" name="message" placeholder="Shade, delivery date, instructions..." className="min-h-[80px]" required disabled={isSubmitting} />
                        </div>
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? 'Sending...' : 'Send Message to Lab'}
                        </Button>
                    </form>
                </div>

                {/* FINANCIAL OVERVIEW */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold">Financial Overview</h2>

                    <div className="mt-4 space-y-3 text-sm">
                        <FinancialRow label="Today" value={`₹${stats.revenueToday.toLocaleString()}`} />
                        <FinancialRow label="This Month" value={`₹${stats.revenueThisMonth.toLocaleString()}`} />
                        <FinancialRow label="Pending" value={`₹${stats.pendingPayments.toLocaleString()}`} />
                    </div>
                </div>

                {/* COMMUNICATION */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold">Communication</h2>

                    <Accordion type="single" collapsible className="w-full mt-4 space-y-2">
                        <AccordionItem value="automated" className="border-none">
                            <AccordionTrigger className="p-3 rounded-lg bg-slate-100 dark:bg-muted/50 hover:no-underline">Automated</AccordionTrigger>
                            <AccordionContent className="space-y-2 pt-2">
                                <Button variant="outline" className="w-full justify-start">Send Appointment Reminders</Button>
                                <Button variant="outline" className="w-full justify-start">Send Birthday Wishes</Button>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="manual" className="border-none">
                            <AccordionTrigger className="p-3 rounded-lg bg-slate-100 dark:bg-muted/50 hover:no-underline">Manual</AccordionTrigger>
                            <AccordionContent className="pt-2">
                                <Link href="/communication" className="text-blue-600 dark:text-primary text-sm">Go to Communication Center →</Link>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>
        </div>
    );
}
