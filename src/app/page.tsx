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
import type { Patient, Appointment, Transaction, Operatory } from '@/types';
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
} from 'lucide-react';
import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { isSameDay, startOfMonth, isSameMonth, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

function QueueItem({ time, name, procedure, status, statusColor }: { time: string, name: string, procedure?: string, status?: string, statusColor?: string }) {
    return (
        <div className="flex justify-between items-center py-3 border-b text-sm">
            <div className="flex items-center gap-4">
                <strong className="w-12 text-muted-foreground">{time}</strong>
                <div>
                    <p className="font-semibold">{name}</p>
                    {procedure && <div className="text-muted-foreground text-xs">{procedure}</div>}
                </div>
            </div>
            {status && (
                <Badge variant={statusColor === 'green' ? 'secondary' : 'destructive'} className={cn(
                    statusColor === 'green' && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
                    statusColor === 'red' && 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
                )}>
                    {status}
                </Badge>
            )}
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
        }
    }, [user, db, clinicId]);

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
                                    <span className="text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        Clinic@Click!
                                    </span>
                                </h1>
                                <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-md leading-relaxed">
                                    Let&apos;s set up your clinic so you can start managing patients, appointments, and more – all in one place.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 px-8 py-6 text-base font-semibold rounded-xl transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                                        <Link href="/clinic" className="flex items-center gap-3">
                                            <ClipboardList className="h-5 w-5" />
                                            Add Your Clinic
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="lg" variant="outline" className="border-2 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 bg-blue-50/20 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-8 py-6 text-base font-semibold rounded-xl transition-all duration-300 hover:-translate-y-0.5">
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
                        <div className="hidden lg:flex items-center justify-center">
                            <img
                                src="/clinic-welcome.png"
                                alt="Dental clinic illustration"
                                className="w-full max-w-md object-contain drop-shadow-2xl"
                            />
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

    return (
        <div className="space-y-6">

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
                                status={app.status === 'Completed' ? 'Completed' : (app.status === 'Scheduled' || app.status === 'Confirmed' ? 'Waiting' : app.status)}
                                statusColor={app.status === 'Completed' ? 'green' : 'red'}
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
