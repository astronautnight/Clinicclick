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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { updateAppointment } from '@/services/appointment-service';


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


function ActionButton({ icon, label, primary, danger, href }: { icon: React.ReactNode, label: string, primary?: boolean, danger?: boolean, href: string }) {
    return (
        <Button asChild variant="outline" className={cn(
            "w-full justify-start gap-3 py-6 text-sm font-medium",
            primary && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
            danger && "bg-destructive/10 text-destructive hover:bg-destructive/20",
            !primary && !danger && "bg-slate-100 dark:bg-muted"
        )}>
            <Link href={href}>
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
                                        <Link href="/clinic" className="flex items-center gap-3">
                                            <ClipboardList className="h-5 w-5" />
                                            Add Your Clinic
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" data-tutorial-id="tutorial-join-clinic" className="border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/20 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-8 py-6 text-base font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5">
                                        <Link href="/clinic" className="flex items-center gap-3">
                                            <UserPlus className="h-5 w-5" />
                                            Join Your Clinic
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
                <div className="lg:col-span-2 bg-white dark:bg-card rounded-xl shadow-sm p-5">
                    <h2 className="text-lg font-semibold mb-4">Patient Queue</h2>

                    {patientQueue.length > 0 ? (
                        patientQueue.map(app => (
                            <QueueItem
                                key={app.id}
                                time={app.startTime}
                                name={app.patientName || "Unknown"}
                                procedure={app.notes || (app.procedureIds && app.procedureIds.length > 0 ? `${app.procedureIds.length} procedure(s)` : 'General Consultation')}
                                status={app.status}
                                onStatusChange={(newStatus) => handleStatusChange(app.id, newStatus)}
                            />
                        ))
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No appointments scheduled for today.</p>
                    )}

                    <Button variant="link" asChild className="text-blue-600 dark:text-primary text-sm mt-4 p-0 h-auto">
                        <Link href="/appointments">View Calendar →</Link>
                    </Button>
                </div>

                {/* QUICK ACTIONS */}
                <div className="bg-white dark:bg-card rounded-xl shadow-sm p-5 space-y-3">
                    <h2 className="text-lg font-semibold">Quick Actions</h2>

                    <ActionButton href="/patients" icon={<UserPlus />} label="New Patient" />
                    <ActionButton href="/patients" icon={<Stethoscope />} label="Open Dental Chart" />
                    <ActionButton href="/financials" icon={<FileText />} label="Generate Invoice" primary />
                    <ActionButton href="/patients" icon={<ImageIcon />} label="Create Appointment" />
                    <ActionButton href="/pharmacy" icon={<FileText />} label="Write Prescription" danger />
                </div>
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
