

'use client';

import { useState, type FormEvent, useEffect, useMemo, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction, TransactionType, TransactionCategory, Patient, Procedure, LinkedProcedure, PaymentMethod, UserProfile, Invoice, Doctor } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, Trash2, MapPin, Users, Edit, Save, CreditCard, Landmark, CircleDollarSign, History, Printer, Copy, FileText, View, Search, MoreVertical } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFirestore, useUser } from '@/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { updatePatient } from '@/services/patient-service';
import { getUserProfile } from '@/services/auth-service';
import { addInvoice, deleteInvoice } from '@/services/invoice-service';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { InvoicePreview } from '@/components/invoice-preview';


const initialTransactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
  date: new Date().toISOString().split('T')[0],
  type: "Earning",
  category: "Consultation Fee",
  description: "",
  amount: 0,
  patientId: "",
  isConsult: false,
  consultLocation: "",
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: "Cash",
};

const earningCategories: TransactionCategory[] = ['Consultation Fee', 'Procedure Payment', 'Lab Charges', 'Miscellaneous Income'];
const expenseCategories: TransactionCategory[] = ['Supplies (Dental)', 'Supplies (Office)', 'Rent', 'Salaries', 'Utilities', 'Equipment Maintenance', 'Loan Payment', 'Miscellaneous Expense'];
const paymentMethods: PaymentMethod[] = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Other'];

interface PatientFinancials extends Patient {
    totalBillable: number;
    totalPaid: number;
    balanceDue: number;
    baseBillable?: number;
    discountAmount?: number;
}

interface EditingProcedureState {
    patientId: string;
    procedureIndex: number;
}

interface GeneratedInvoice {
    patient: PatientFinancials;
    clinic: UserProfile;
    doctor?: Doctor | null;
    invoiceDate: string;
    totalAmount: number;
    gstAmount: number;
    finalAmount: number;
    gstRate: number;
    balanceDue: number;
    totalPaid: number;
}


export default function FinancialsPage() {
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientFinancials, setPatientFinancials] = useState<PatientFinancials[]>([]);
  const [editingProcedure, setEditingProcedure] = useState<EditingProcedureState | null>(null);
  
  const [newTransaction, setNewTransaction] = useState(initialTransactionData);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const [clinicProfile, setClinicProfile] = useState<UserProfile | null>(null);
  const [clinicDetails, setClinicDetails] = useState<{ name: string } | null>(null);
  const [invoicePatientId, setInvoicePatientId] = useState<string>('');
  const [invoiceDoctorId, setInvoiceDoctorId] = useState<string>('');
  const [gstRate, setGstRate] = useState<number>(0);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [generatedInvoice, setGeneratedInvoice] = useState<GeneratedInvoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [invoiceToPreview, setInvoiceToPreview] = useState<GeneratedInvoice | null>(null);
  const [savedInvoiceSearch, setSavedInvoiceSearch] = useState('');

  const [discountPatient, setDiscountPatient] = useState<PatientFinancials | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [discountValueState, setDiscountValueState] = useState<string>('');
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);

  const handleOpenDiscountDialog = (patient: PatientFinancials) => {
    setDiscountPatient(patient);
    setDiscountType(patient.discountType || 'fixed');
    setDiscountValueState(patient.discountValue ? patient.discountValue.toString() : '');
    setIsDiscountDialogOpen(true);
  };

  const handleApplyDiscount = async () => {
    if (!user || !clinicId || !discountPatient) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const value = parseFloat(discountValueState) || 0;
    const success = await updatePatient(clinicId, discountPatient.id, {
      discountType: discountType,
      discountValue: value
    });

    if (success) {
      toast({ title: "Discount Applied", description: `Discount applied to ${discountPatient.firstName}.` });
      setIsDiscountDialogOpen(false);
    } else {
      toast({ title: "Error", description: "Could not apply discount to patient.", variant: "destructive" });
    }
  };


   useEffect(() => {
    if (!user || !db || !clinicId) return;

    const uid = user.uid;
    async function loadProfile() {
        const profile = await getUserProfile(uid);
        setClinicProfile(profile);
    }
    loadProfile();

    const clinicDocRef = doc(db, 'clinics', clinicId);
    const unsubClinic = onSnapshot(clinicDocRef, (snap) => {
        if (snap.exists()) {
            setClinicDetails(snap.data() as {name: string});
        }
    });

    const patientsColRef = collection(db, "clinics", clinicId, "patients");
    const unsubPatients = onSnapshot(patientsColRef, (snapshot) => {
      const fetchedPatients = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      setPatients(fetchedPatients);
    }, (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: patientsColRef.path, operation: 'list' }));
        console.error("Error fetching patients:", err)
    });
    
    const transactionsColRef = collection(db, "clinics", clinicId, "transactions");
    const unsubTransactions = onSnapshot(transactionsColRef, (snapshot) => {
        const fetchedTransactions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(fetchedTransactions);
    }, (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: transactionsColRef.path, operation: 'list' }));
        console.error("Error fetching transactions:", err);
    });

    const invoicesColRef = collection(db, "clinics", clinicId, "invoices");
    const unsubInvoices = onSnapshot(invoicesColRef, (snapshot) => {
        const fetchedInvoices = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice))
            .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
        setSavedInvoices(fetchedInvoices);
    }, (err) => {
         errorEmitter.emit('permission-error', new FirestorePermissionError({ path: invoicesColRef.path, operation: 'list' }));
        console.error("Error fetching invoices:", err);
    });

    const doctorsColRef = collection(db, "clinics", clinicId, "doctors");
    const unsubDoctors = onSnapshot(doctorsColRef, (snapshot) => {
        const fetchedDoctors = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
        setDoctors(fetchedDoctors);
    }, (err) => {
        console.error("Error fetching doctors:", err)
    });


    return () => {
      unsubClinic();
      unsubPatients();
      unsubTransactions();
      unsubInvoices();
      unsubDoctors();
    };
  }, [user, db, clinicId]);

  useEffect(() => {
    const financials = patients.map(patient => {
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

        const balanceDue = totalBillable - totalPaid;

        return {
          ...patient,
          totalBillable,
          totalPaid,
          balanceDue,
          baseBillable,
          discountAmount: discount
        };
    }).sort((a,b) => b.balanceDue - a.balanceDue);
    setPatientFinancials(financials);
  }, [patients, transactions]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleSelectChange = (name: keyof Transaction, value: string) => {
    setNewTransaction(prev => ({ ...prev, [name]: value }));
     if (name === 'type') {
      setNewTransaction(prev => ({ ...prev, category: value === 'Earning' ? earningCategories[0] : expenseCategories[0] }));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !db || !clinicId) {
        toast({title: "Not Authenticated", variant: "destructive"});
        return;
    }
    
    const payload = {
        ...newTransaction,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const transactionsColRef = collection(db, 'clinics', clinicId, 'transactions');
    
    addDoc(transactionsColRef, payload).then(() => {
        toast({ title: "Transaction Added", description: `${newTransaction.type} of ₹${newTransaction.amount} recorded.` });
        setNewTransaction(initialTransactionData);
        setIsFormOpen(false);
    }).catch(error => {
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: transactionsColRef.path, operation: 'create', requestResourceData: payload });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error adding transaction:", error);
            toast({ title: "Error", description: "Could not add transaction.", variant: "destructive" });
        }
    });
  };

  const handleDeleteTransaction = () => {
    if (transactionToDelete && user && db && clinicId) {
      const docRef = doc(db, 'clinics', clinicId, 'transactions', transactionToDelete.id);
      deleteDoc(docRef).then(() => {
          toast({ title: "Transaction Deleted", description: `Transaction of ₹${transactionToDelete.amount.toLocaleString()} has been removed.` });
          setTransactionToDelete(null);
      }).catch(error => {
          if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
          } else {
            console.error("Error deleting transaction:", error);
            toast({ title: "Error", description: "Could not delete transaction.", variant: "destructive" });
          }
      })
    }
  };
  
  const handleSavePatientTotalPaid = async (patientId: string, newTotalPaid: number) => {
    if (!user || !db || !clinicId || isNaN(newTotalPaid)) {
        toast({ title: "Error", description: "Invalid input or not logged in.", variant: "destructive" });
        return;
    }

    const currentTotalPaid = transactions
        .filter(t => t.patientId === patientId && t.type === 'Earning')
        .reduce((acc, t) => acc + t.amount, 0);

    const adjustmentAmount = newTotalPaid - currentTotalPaid;

    if (adjustmentAmount === 0) {
        toast({ title: "No Change", description: "The paid amount is already up to date." });
        return;
    }
    
    const transactionsColRef = collection(db, 'clinics', clinicId, 'transactions');
    const payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        date: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        type: "Earning",
        category: "Miscellaneous Income",
        description: `Manual payment adjustment.`,
        amount: adjustmentAmount,
        patientId: patientId,
        paymentMethod: "Other",
    };
    
    try {
        await addDoc(transactionsColRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        toast({
            title: "Payment Updated",
            description: `An adjustment of ₹${adjustmentAmount.toLocaleString()} has been recorded.`,
        });
    } catch (error: any) {
        console.error("Error creating adjustment transaction:", error);
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: transactionsColRef.path,
                operation: 'create',
                requestResourceData: payload,
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ title: "Error", description: "Could not record payment adjustment.", variant: "destructive" });
        }
    }
  };

  const handleSaveProcedureCost = async (patientId: string, procedureIndex: number, newCost: number) => {
     if (!user || !clinicId) {
        toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
        return;
    }
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.linkedProcedures) return;

    const updatedProcedures = patient.linkedProcedures.map((proc, index) => {
        if (index === procedureIndex) {
            return { ...proc, cost: newCost };
        }
        return proc;
    });

    const success = await updatePatient(clinicId, patientId, { linkedProcedures: updatedProcedures });
    if (success) {
        toast({ title: "Procedure Cost Updated", description: "The cost has been saved." });
        setEditingProcedure(null);
    } else {
         toast({ title: "Update Failed", description: "Could not save the procedure cost.", variant: "destructive" });
    }
  };

  const handleGenerateInvoice = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!invoicePatientId || !invoiceDoctorId) {
        toast({ title: "Error", description: "Please select a patient and a doctor.", variant: "destructive" });
        return;
    }
    const patient = patientFinancials.find(p => p.id === invoicePatientId);
    if (!patient || !clinicProfile) {
        toast({ title: "Error", description: "Patient or clinic data not found.", variant: "destructive" });
        return;
    }
    
    const totalAmount = patient.totalBillable;
    const gstAmount = gstRate > 0 ? totalAmount * (gstRate / 100) : 0;
    const finalAmount = totalAmount + gstAmount;

    const doctor = doctors.find(d => d.id === invoiceDoctorId) || null;
    
    const clinicInfoForInvoice = {
        ...clinicProfile,
        clinicName: clinicDetails?.name || clinicProfile.clinicName || 'Dental Clinic'
    } as UserProfile;

    const invoiceData: GeneratedInvoice = { 
        patient, 
        clinic: clinicInfoForInvoice,
        doctor,
        invoiceDate: new Date().toISOString(), 
        totalAmount, 
        gstAmount, 
        finalAmount, 
        gstRate,
        balanceDue: patient.balanceDue,
        totalPaid: patient.totalPaid,
    };

    setGeneratedInvoice(invoiceData);
    setInvoiceToPreview(invoiceData);
    setIsInvoiceDialogOpen(true);
  };
  
  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContents;
      // Reload is required to re-hydrate React app
      window.location.reload(); 
    }
  };

  const handleCopy = () => {
    const invoiceToUse = invoiceToPreview || generatedInvoice;
    if (!invoiceToUse) return;
    const { patient, clinic, totalAmount, gstAmount, finalAmount, gstRate, invoiceDate, doctor } = invoiceToUse;
    let text = `*** INVOICE ***\n\n`;
    text += `From:\n${clinic.clinicName || 'Your Clinic'}\n`;
    if (doctor) {
        text += `Dr. ${doctor.name}`;
        if(doctor.specialization) text += ` • ${doctor.specialization}`;
        if(doctor.registrationNumber) text += ` • Reg. No: ${doctor.registrationNumber}`;
        text += `\n`;
    }
    text += `${clinic.address || ''}\n\n`;
    text += `To:\n${patient.firstName} ${patient.lastName}\nContact: ${patient.contactNumber}\n\n`;
    text += `Date: ${format(new Date(invoiceDate), 'dd/MM/yyyy')}\n\n`;
    text += `--- PROCEDURES ---\n`;
    patient.linkedProcedures?.forEach(proc => {
        text += `${proc.procedureName} (Qty: ${proc.quantity || 1}) - ₹${(proc.cost * (proc.quantity || 1)).toLocaleString()}\n`;
    });
    text += `--------------------\n`;
    text += `Subtotal: ₹${totalAmount.toLocaleString()}\n`;
    if (gstRate > 0) {
        text += `GST (${gstRate}%): ₹${gstAmount.toLocaleString()}\n`;
    }
    text += `TOTAL: ₹${finalAmount.toLocaleString()}\n\n`;
    text += `Amount Paid: ₹${patient.totalPaid.toLocaleString()}\n`;
    text += `Balance Due: ₹${patient.balanceDue.toLocaleString()}\n`;

    navigator.clipboard.writeText(text);
    toast({ title: 'Invoice Copied', description: 'Invoice details copied to clipboard.' });
  };
  
  const calculateSummary = (period: 'daily' | 'weekly' | 'monthly') => {
      const now = new Date();
      let totalEarnings = 0;
      let totalExpenses = 0;

      transactions.forEach(t => {
          const transactionDate = new Date(t.date);
          let include = false;
          if (period === 'daily') {
              include = transactionDate.toDateString() === now.toDateString();
          } else if (period === 'weekly') {
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay()); 
              startOfWeek.setHours(0,0,0,0);
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              endOfWeek.setHours(23,59,59,999);
              include = transactionDate >= startOfWeek && transactionDate <= endOfWeek;
          } else if (period === 'monthly') {
              include = transactionDate.getFullYear() === now.getFullYear() && transactionDate.getMonth() === now.getMonth();
          }

          if (include) {
              if (t.type === 'Earning') totalEarnings += t.amount;
              else totalExpenses += t.amount;
          }
      });
      return { totalEarnings, totalExpenses, net: totalEarnings - totalExpenses };
  };

  const handleSaveInvoice = async () => {
    if (!generatedInvoice || !user || !clinicId) return;

    try {
        await addInvoice(clinicId, generatedInvoice);
        toast({ title: "Invoice Saved", description: "The invoice has been saved to your records." });
        setGeneratedInvoice(null); // Clear after saving
        setIsInvoiceDialogOpen(false);
    } catch (error) {
        console.error("Error saving invoice:", error);
        toast({ title: "Save Failed", description: "Could not save the invoice.", variant: "destructive" });
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete || !user || !clinicId) return;
    try {
        await deleteInvoice(clinicId, invoiceToDelete.id);
        toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
        setInvoiceToDelete(null);
    } catch (error) {
         console.error("Error deleting invoice:", error);
        toast({ title: "Delete Failed", description: "Could not delete the invoice.", variant: "destructive" });
    }
  };

  const handleViewInvoice = (invoice: Invoice) => {
    const patient = patientFinancials.find(p => p.id === invoice.patientId);
    if (!patient || !invoice.clinicDetails) {
        toast({ title: "Error", description: "Could not find patient or clinic data for this invoice.", variant: "destructive" });
        return;
    }
    setInvoiceToPreview({
        patient,
        clinic: invoice.clinicDetails,
        doctor: invoice.doctorDetails,
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        gstAmount: invoice.gstAmount,
        finalAmount: invoice.finalAmount,
        gstRate: invoice.gstRate,
        balanceDue: patient.balanceDue,
        totalPaid: patient.totalPaid,
    });
    setIsInvoiceDialogOpen(true);
  };

  const filteredInvoices = useMemo(() => {
    if (!savedInvoiceSearch) return savedInvoices;
    const query = savedInvoiceSearch.toLowerCase();
    return savedInvoices.filter(invoice => {
        const patient = patients.find(p => p.id === invoice.patientId);
        return patient?.firstName.toLowerCase().includes(query) || patient?.lastName.toLowerCase().includes(query) || format(new Date(invoice.invoiceDate), 'dd/MM/yyyy').toLowerCase().includes(query);
    });
  }, [savedInvoices, savedInvoiceSearch, patients]);

  const dailySummary = useMemo(() => calculateSummary('daily'), [transactions]);
  const weeklySummary = useMemo(() => calculateSummary('weekly'), [transactions]);
  const monthlySummary = useMemo(() => calculateSummary('monthly'), [transactions]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <DollarSign className="mr-3 h-8 w-8 text-warning" />
          Financials
        </h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => {setNewTransaction(initialTransactionData); setIsFormOpen(true);}}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
                 <DialogHeader>
                    <DialogTitle>Add New Transaction</DialogTitle>
                    <DialogDescription>Record a new earning or expense for the clinic.</DialogDescription>
                </DialogHeader>
                 <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="date">Transaction Date</Label>
                                <Input id="date" name="date" type="date" value={newTransaction.date} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <Label htmlFor="paymentDate">Payment Date</Label>
                                <Input id="paymentDate" name="paymentDate" type="date" value={newTransaction.paymentDate || ''} onChange={handleInputChange} required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="type">Type</Label>
                                <Select name="type" value={newTransaction.type} onValueChange={(val: TransactionType) => handleSelectChange('type', val)} required>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                    <SelectItem value="Earning">Earning</SelectItem>
                                    <SelectItem value="Expense">Expense</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div>
                                <Label htmlFor="paymentMethod">Payment Method</Label>
                                <Select name="paymentMethod" value={newTransaction.paymentMethod || 'Other'} onValueChange={(val: PaymentMethod) => handleSelectChange('paymentMethod', val)} required>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {paymentMethods.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <Label htmlFor="category">Category</Label>
                            <Select name="category" value={newTransaction.category} onValueChange={(val: TransactionCategory) => handleSelectChange('category', val)} required>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                {(newTransaction.type === 'Earning' ? earningCategories : expenseCategories).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            </div>
                            <div><Label htmlFor="amount">Amount (₹)</Label><Input id="amount" name="amount" type="number" value={newTransaction.amount} onChange={handleInputChange} required min="0.01" step="0.01" /></div>
                        </div>
                        {newTransaction.type === 'Earning' && (
                            <div>
                            <Label htmlFor="patientId">Patient (Optional)</Label>
                            <Select name="patientId" value={newTransaction.patientId || ''} onValueChange={(val) => handleSelectChange('patientId', val)}>
                                <SelectTrigger><SelectValue placeholder="Select Patient (if applicable)"/></SelectTrigger>
                                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.isConsult ? '(Consult)' : ''}</SelectItem>)}</SelectContent>
                            </Select>
                            </div>
                        )}
                        <div className="items-start flex space-x-2">
                            <Checkbox id="isConsult" checked={newTransaction.isConsult} onCheckedChange={(checked) => setNewTransaction(prev => ({...prev, isConsult: !!checked}))} />
                            <div className="grid gap-1.5 leading-none">
                              <Label htmlFor="isConsult" className="text-sm font-medium">
                              This transaction is for a consultation
                              </Label>
                            </div>
                        </div>
                         {newTransaction.isConsult && (
                          <div className="space-y-2 pl-6">
                            <Label htmlFor="consultLocation">Consult Location / Clinic Name</Label>
                            <Input id="consultLocation" name="consultLocation" value={newTransaction.consultLocation || ''} onChange={handleInputChange} placeholder="e.g., City General Hospital" />
                          </div>
                        )}
                        <div><Label htmlFor="description">Description (Optional)</Label><Textarea id="description" name="description" value={newTransaction.description} onChange={handleInputChange} /></div>
                    </div>
                    <DialogFooter className="pt-4 mt-4 border-t">
                        <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                        <Button type="submit">Add Transaction</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-special1"/> Patient Accounts</CardTitle>
            <CardDescription>Financial summary for each patient. Expand to see linked procedures and payment history.</CardDescription>
        </CardHeader>
        <CardContent>
            {patientFinancials.length === 0 ? (
                 <div className="flex flex-col items-center justify-center text-center p-6 min-h-[150px] border rounded-lg bg-muted/30">
                    <p className="text-lg font-medium text-muted-foreground mb-2">No patients found.</p>
                    <p className="text-sm text-muted-foreground mb-4">Add patients in the 'Patients' tab to see their financial summary here.</p>
                </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[700px]">
                    <div className="hidden md:grid grid-cols-12 items-center w-full text-sm font-semibold text-muted-foreground px-4 py-2 border-b">
                        <div className="col-span-5 md:col-span-5">Patient</div>
                        <div className="text-right col-span-2">Billable</div>
                        <div className="text-right col-span-2">Paid</div>
                        <div className="text-right col-span-3 md:col-span-2">Due</div>
                        <div className="text-right col-span-1 pr-2">Actions</div>
                    </div>
                    <Accordion type="multiple" className="space-y-2 md:space-y-0">
                        {patientFinancials.map(p => {
                            const patientTransactions = transactions.filter(t => t.patientId === p.id && t.type === 'Earning');
                            return (
                            <AccordionItem value={p.id} key={p.id} className="border-b-0 md:border-b">
                                <Card className="border-0 md:border shadow-none md:shadow-sm">
                                    <AccordionTrigger className="p-4 hover:no-underline font-normal data-[state=open]:bg-muted/50">
                                        <div className="grid grid-cols-12 items-center w-full text-sm text-left">
                                            <div className="col-span-12 md:col-span-5 font-semibold">{p.firstName} {p.lastName}</div>
                                            <div className="text-right font-bold col-span-3 md:col-span-2 mt-2 md:mt-0">
                                                <span className='md:hidden font-normal text-muted-foreground'>Billable: </span>
                                                ₹{p.totalBillable.toLocaleString()}
                                                {p.discountAmount && p.discountAmount > 0 ? (
                                                    <div className="text-[10px] text-muted-foreground font-normal line-through">
                                                        ₹{(p.baseBillable || 0).toLocaleString()}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div className="text-right text-green-600 flex items-center justify-end col-span-3 md:col-span-2">
                                                <span className='md:hidden font-normal text-muted-foreground'>Paid: </span>
                                                <span className="mr-1">₹</span>
                                                <Input
                                                    key={p.totalPaid}
                                                    type="number"
                                                    defaultValue={p.totalPaid}
                                                    className="w-24 h-7 text-right p-1 bg-background"
                                                    onClick={(e) => e.stopPropagation()}
                                                    onBlur={(e) => handleSavePatientTotalPaid(p.id, parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                            <div className={`text-right font-bold col-span-3 md:col-span-2 ${p.balanceDue > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                <span className='md:hidden font-normal text-muted-foreground'>Due: </span>
                                                ₹{p.balanceDue.toLocaleString()}
                                            </div>
                                            <div className="text-right col-span-3 md:col-span-1 pr-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenDiscountDialog(p)}>
                                                            Add discount
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="px-4 pb-4 space-y-4">
                                            {(p.linkedProcedures && p.linkedProcedures.length > 0) ? (
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2">Billed Procedures</h4>
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead className="w-[60%]">Procedure</TableHead>
                                                                <TableHead className="text-right">Cost (₹)</TableHead>
                                                                <TableHead className="text-right">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {(p.linkedProcedures || []).map((proc, index) => (
                                                                <TableRow key={`${p.id}-proc-${index}`} className="text-sm">
                                                                    <TableCell className="text-muted-foreground">{proc.procedureName}</TableCell>
                                                                    <TableCell className="text-right text-muted-foreground">
                                                                        {editingProcedure?.patientId === p.id && editingProcedure?.procedureIndex === index ? (
                                                                            <Input type="number" defaultValue={proc.cost} className="w-24 ml-auto text-right" autoFocus onBlur={(e) => handleSaveProcedureCost(p.id, index, parseFloat(e.target.value) || 0)} />
                                                                        ) : (
                                                                            `₹${proc.cost.toLocaleString()}`
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        {editingProcedure?.patientId === p.id && editingProcedure?.procedureIndex === index ? (
                                                                            <Button variant="ghost" size="icon" onClick={() => setEditingProcedure(null)}>
                                                                                <Save className="h-4 w-4 text-primary" />
                                                                            </Button>
                                                                        ) : (
                                                                            <Button variant="ghost" size="icon" onClick={() => setEditingProcedure({patientId: p.id, procedureIndex: index})}>
                                                                                <Edit className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-center text-sm text-muted-foreground py-4 border rounded-md">No procedures linked to this patient yet.</p>
                                            )}
                                            {patientTransactions.length > 0 ? (
                                                <div>
                                                    <h4 className="text-sm font-semibold mb-2 flex items-center">
                                                        <History className="h-4 w-4 mr-2" />
                                                        Payment History
                                                    </h4>
                                                     <Table>
                                                        <TableHeader>
                                                            <TableRow>
                                                                <TableHead>Payment Date</TableHead>
                                                                <TableHead>Method</TableHead>
                                                                <TableHead>Description</TableHead>
                                                                <TableHead className="text-right">Amount (₹)</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {patientTransactions.map(trans => (
                                                                <TableRow key={trans.id} className="text-sm">
                                                                    <TableCell>{trans.paymentDate ? format(new Date(trans.paymentDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
                                                                    <TableCell><Badge variant="outline">{trans.paymentMethod || 'Other'}</Badge></TableCell>
                                                                    <TableCell className="text-muted-foreground">{trans.description || trans.category}</TableCell>
                                                                    <TableCell className="text-right font-medium">₹{trans.amount.toLocaleString()}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            ) : (
                                                <p className="text-center text-sm text-muted-foreground py-4 border rounded-md">No payments recorded for this patient yet.</p>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </Card>
                            </AccordionItem>
                        )})}
                    </Accordion>
                </div>
              </div>
            )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily Net</CardTitle>
                    <DollarSign className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{dailySummary.net.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                        Earnings: ₹{dailySummary.totalEarnings.toLocaleString()} | Expenses: ₹{dailySummary.totalExpenses.toLocaleString()}
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weekly Net</CardTitle>
                    <DollarSign className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{weeklySummary.net.toLocaleString()}</div>
                     <p className="text-xs text-muted-foreground">
                        Earnings: ₹{weeklySummary.totalEarnings.toLocaleString()} | Expenses: ₹{weeklySummary.totalExpenses.toLocaleString()}
                    </p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Net</CardTitle>
                    <DollarSign className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">₹{monthlySummary.net.toLocaleString()}</div>
                     <p className="text-xs text-muted-foreground">
                        Earnings: ₹{monthlySummary.totalEarnings.toLocaleString()} | Expenses: ₹{monthlySummary.totalExpenses.toLocaleString()}
                    </p>
                </CardContent>
            </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Invoice Generation</CardTitle>
            <CardDescription>Create a printable invoice for a patient.</CardDescription>
        </CardHeader>
        <form onSubmit={handleGenerateInvoice}>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label htmlFor="invoicePatient">Select Patient *</Label>
                        <Select value={invoicePatientId} onValueChange={setInvoicePatientId} required>
                            <SelectTrigger><SelectValue placeholder="Select a patient..." /></SelectTrigger>
                            <SelectContent>
                                {patientFinancials.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="invoiceDoctor">Select Doctor *</Label>
                        <Select value={invoiceDoctorId} onValueChange={setInvoiceDoctorId} required>
                            <SelectTrigger><SelectValue placeholder="Select a doctor..." /></SelectTrigger>
                            <SelectContent>
                                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="gstRate">GST Rate (%) (Optional)</Label>
                        <Input id="gstRate" type="number" value={gstRate} onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)} min="0" step="0.1" />
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button type="submit">
                    <FileText className="mr-2 h-4 w-4"/>
                    Generate Invoice
                </Button>
            </CardFooter>
        </form>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Saved Invoices</CardTitle>
            <CardDescription>View and manage all saved invoices.</CardDescription>
             <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by patient name or date..."
                    value={savedInvoiceSearch}
                    onChange={(e) => setSavedInvoiceSearch(e.target.value)}
                    className="pl-10"
                />
            </div>
        </CardHeader>
        <CardContent>
            {filteredInvoices.length === 0 ? (
                <div className="text-center text-muted-foreground p-4">No saved invoices found.</div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.map(invoice => {
                            const patient = patients.find(p => p.id === invoice.patientId);
                            return (
                                <TableRow key={invoice.id}>
                                    <TableCell>{format(new Date(invoice.invoiceDate), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</TableCell>
                                    <TableCell className="text-right">₹{invoice.finalAmount.toLocaleString()}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(invoice)}><View className="h-4 w-4" /></Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" onClick={() => setInvoiceToDelete(invoice)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeaderCustom>
                                                    <AlertDialogTitleCustom>Delete Invoice?</AlertDialogTitleCustom>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete this invoice? This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeaderCustom>
                                                <AlertDialogFooterCustom>
                                                    <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={handleDeleteInvoice}>Delete</AlertDialogAction>
                                                </AlertDialogFooterCustom>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
        if (!open) {
            // Reset both transient and preview states on close
            setGeneratedInvoice(null);
            setInvoiceToPreview(null);
        }
      }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>Review the generated invoice below. You can save, print, or copy it.</DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto" ref={printRef}>
            {(invoiceToPreview || generatedInvoice) && (
                <InvoicePreview invoice={(invoiceToPreview || generatedInvoice)!} />
            )}
          </div>
          <DialogFooter className="border-t pt-4 flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={handleCopy}><Copy className="mr-2 h-4 w-4"/>Copy</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/>Print</Button>
            {generatedInvoice && (
              <Button onClick={handleSaveInvoice}><Save className="mr-2 h-4 w-4"/>Save Invoice</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>
              Apply an overall discount to {discountPatient?.firstName} {discountPatient?.lastName}&apos;s total billable amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select
                value={discountType}
                onValueChange={(val: 'fixed' | 'percentage') => setDiscountType(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {discountType === 'fixed' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
              </Label>
              <Input
                type="number"
                value={discountValueState}
                onChange={(e) => setDiscountValueState(e.target.value)}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'fixed' ? 'e.g. 500' : 'e.g. 10'}
              />
            </div>
            {discountPatient && (
              <div className="bg-muted p-3 rounded-lg text-xs space-y-1 border">
                <div className="flex justify-between">
                  <span>Base Billable:</span>
                  <span className="font-semibold">₹{(discountPatient.baseBillable || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Applied Discount:</span>
                  <span className="font-semibold text-red-600">
                    - ₹{(() => {
                      const val = parseFloat(discountValueState) || 0;
                      if (discountType === 'percentage') {
                        return ((discountPatient.baseBillable || 0) * val / 100).toLocaleString();
                      }
                      return val.toLocaleString();
                    })()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-muted-foreground/20 pt-1 font-semibold text-sm">
                  <span>New Total Billable:</span>
                  <span>
                    ₹{(() => {
                      const base = discountPatient.baseBillable || 0;
                      const val = parseFloat(discountValueState) || 0;
                      const disc = discountType === 'percentage' ? (base * val / 100) : val;
                      return Math.max(0, base - disc).toLocaleString();
                    })()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyDiscount}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
