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
  ShieldCheck,
  Cloud,
  Lock,
  Loader2,
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


// Reusable components
function FeatureCard({ title, icon }: { title: string, icon: React.ReactNode }) {
    return (
        <Card className="p-6 flex flex-col items-center text-center shadow-none border">
            <div className="p-3 bg-primary/10 rounded-full mb-4">{icon}</div>
            <CardTitle className="text-lg">{title}</CardTitle>
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
    const [labs, setLabs] = useState<{id: string, name: string, email: string}[]>([]);
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
        const unsubPatients = onSnapshot(patientsCol, (snap) => setPatients(snap.docs.map(d => ({...d.data(), id: d.id } as Patient))));

        const appointmentsCol = collection(db, 'clinics', clinicId, 'appointments');
        const unsubAppointments = onSnapshot(appointmentsCol, (snap) => setAppointments(snap.docs.map(d => ({...d.data(), id: d.id } as Appointment))));
        
        const transactionsCol = collection(db, 'clinics', clinicId, 'transactions');
        const unsubTransactions = onSnapshot(transactionsCol, (snap) => setTransactions(snap.docs.map(d => ({...d.data(), id: d.id } as Transaction))));

        const operatoriesCol = collection(db, 'clinics', clinicId, 'operatories');
        const unsubOperatories = onSnapshot(operatoriesCol, (snap) => setOperatories(snap.docs.map(d => ({...d.data(), id: d.id } as Operatory))));

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
            const totalBillable = patient.linkedProcedures?.reduce((acc, proc) => acc + (proc.cost * (proc.quantity || 1)), 0) || 0;
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
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                    Welcome to Clinic@Click!
                </h1>
                <p className="mt-6 text-lg text-muted-foreground max-w-lg">
                    Manage your clinic efficiently.
                </p>
                <div className="flex gap-4 mt-10">
                    <Button asChild size="lg" className="px-8 font-semibold">
                        <Link href="/clinic">Add Your Clinic</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="px-8 font-semibold">
                        <Link href="/clinic">Join Existing Clinic</Link>
                    </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20 w-full max-w-5xl">
                    <FeatureCard title="Manage Patients" icon={<Users className="w-6 h-6 text-primary" />} />
                    <FeatureCard title="X-Ray Management" icon={<ImageIcon className="w-6 h-6 text-primary" />} />
                    <FeatureCard title="Billing & Payments" icon={<DollarSign className="w-6 h-6 text-primary" />} />
                    <FeatureCard title="Team Collaboration" icon={<Stethoscope className="w-6 h-6 text-primary" />} />
                </div>
                <div className="mt-20 border-t pt-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center text-muted-foreground text-sm w-full max-w-5xl">
                    <div><AlertTriangle className="w-6 h-6 mx-auto mb-2 text-primary" />Secure</div>
                    <div><ShieldCheck className="w-6 h-6 mx-auto mb-2 text-primary" />Encrypted</div>
                    <div><Cloud className="w-6 h-6 mx-auto mb-2 text-primary" />Backed Up</div>
                    <div><Lock className="w-6 h-6 mx-auto mb-2 text-primary" />Private</div>
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
          <StatCard title="In Chair" value={String(stats.inChairCount)} icon={<Stethoscope className="text-blue-500"/>} highlight />
          <StatCard title="Today's Appointments" value={String(stats.todaysAppointmentsCount)} icon={<Calendar className="text-purple-500"/>} />
          <StatCard title="Revenue Today" value={`₹${stats.revenueToday.toLocaleString()}`} icon={<IndianRupee className="text-green-500"/>} success />
          <StatCard title="Pending Payments" value={`₹${stats.pendingPayments.toLocaleString()}`} icon={<Wallet className="text-red-500"/>} danger />
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
