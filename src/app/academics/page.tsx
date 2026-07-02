'use client';

import { useState, useEffect, useRef, useCallback, type FormEvent, type ChangeEvent } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { onSnapshot, query, orderBy } from 'firebase/firestore';
import type { Department, StudentCaseHistory, AttendanceStatus, MarkedTooth, StudentFinancialEntry } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { BookUser, PlusCircle, CalendarDays, ClipboardList, ChevronLeft, ChevronRight, CalendarIcon, DollarSign, Edit, Trash2, User, Stethoscope, Clipboard, FileText, ChevronDown, ChevronUp, Camera, ImagePlus, X, Eye, Check } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { format, getDaysInMonth } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { DentalChart } from '@/components/dental-chart';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import {
    addPersonalCaseHistory,
    updatePersonalCaseHistory,
    deletePersonalCaseHistory,
    addPersonalDepartment,
    setPersonalAttendance,
    addPersonalFinance,
    getPersonalAcademicsCol,
} from '@/services/personal-academics-service';
import { uploadCasePhoto, deleteCasePhoto } from '@/services/case-photo-service';
import { Info } from 'lucide-react';


const initialCaseHistoryData: {
    patientName: string;
    patientAge: string;
    patientGender: 'Male' | 'Female' | 'Other';
    departmentId: string;
    departmentName: string;
    chiefComplaint: string;
    medicalHistory: string;
    dentalHistory: string;
    examinationFindings: string;
    diagnosis: string;
    treatmentPlan: string;
    markedTeeth: MarkedTooth[];
    stagedObservations: string[];
    clinicalPhotos: string[];
} = {
    patientName: '',
    patientAge: '',
    patientGender: 'Other',
    departmentId: '',
    departmentName: '',
    chiefComplaint: '',
    medicalHistory: '',
    dentalHistory: '',
    examinationFindings: '',
    diagnosis: '',
    treatmentPlan: '',
    markedTeeth: [],
    stagedObservations: [],
    clinicalPhotos: [],
};

const initialFinanceData = {
    type: 'Receivable' as 'Receivable' | 'Payable',
    description: '',
    amount: '',
    patientName: '',
};

export default function AcademicsPage() {
    const { user } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    // ── Academic data is ALWAYS personal, never shared with any clinic ──
    const [departments, setDepartments] = useState<Department[]>([]);
    const [caseHistories, setCaseHistories] = useState<StudentCaseHistory[]>([]);
    const [attendance, setAttendance] = useState<Record<string, { status: AttendanceStatus, departmentName: string }>>({});
    const [finances, setFinances] = useState<StudentFinancialEntry[]>([]);

    const [loading, setLoading] = useState(true);

    // UI states
    const [isCaseFormOpen, setIsCaseFormOpen] = useState(false);
    const [caseFormData, setCaseFormData] = useState(initialCaseHistoryData);
    const [editingCaseHistoryId, setEditingCaseHistoryId] = useState<string | null>(null);
    const [caseHistoryToDelete, setCaseHistoryToDelete] = useState<StudentCaseHistory | null>(null);
    const [isChartExpanded, setIsChartExpanded] = useState(false);

    // Photo upload states
    const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
    const [pendingPhotoUrls, setPendingPhotoUrls] = useState<string[]>([]); // preview URLs for pending files
    const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
    const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    const cardPhotoInputRef = useRef<HTMLInputElement>(null);
    const [uploadingForCaseId, setUploadingForCaseId] = useState<string | null>(null);


    const [isAttendanceFormOpen, setIsAttendanceFormOpen] = useState(false);
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [attendanceDepartmentId, setAttendanceDepartmentId] = useState('');
    const [summaryMonth, setSummaryMonth] = useState(new Date());
    const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

    const [isFinanceFormOpen, setIsFinanceFormOpen] = useState(false);
    const [financeFormData, setFinanceFormData] = useState(initialFinanceData);
    
    const [isAddDeptDialogOpen, setIsAddDeptDialogOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [addDeptContext, setAddDeptContext] = useState<'case' | 'attendance' | null>(null);

    // Data fetching — subscribe to PERSONAL academic data only
    useEffect(() => {
        if (!user?.uid || !db) { setLoading(false); return; }
        setLoading(true);

        const uid = user.uid;
        const unsubs: (() => void)[] = [];

        unsubs.push(
            onSnapshot(getPersonalAcademicsCol(uid, 'departments'), snap => {
                setDepartments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Department)).sort((a, b) => a.name.localeCompare(b.name)));
            }),
            onSnapshot(getPersonalAcademicsCol(uid, 'studentCaseHistories'), snap => {
                setCaseHistories(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentCaseHistory)).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
            }),
            onSnapshot(getPersonalAcademicsCol(uid, 'attendance'), snap => {
                const data: Record<string, { status: AttendanceStatus, departmentName: string }> = {};
                snap.forEach(doc => { const d = doc.data(); data[doc.id] = { status: d.status, departmentName: d.departmentName || 'N/A' }; });
                setAttendance(data);
            }),
            onSnapshot(query(getPersonalAcademicsCol(uid, 'finances'), orderBy('date', 'desc')), snap => {
                setFinances(snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentFinancialEntry)));
            }),
        );

        setLoading(false);
        return () => unsubs.forEach(u => u());
    }, [user?.uid, db]);
    
    const handleOpenCaseForm = (caseHistory: StudentCaseHistory | null) => {
        setIsChartExpanded(false);
        setPendingPhotoFiles([]);
        setPendingPhotoUrls([]);
        if (caseHistory) {
            setEditingCaseHistoryId(caseHistory.id);
            setCaseFormData({
                patientName: caseHistory.patientName,
                patientAge: String(caseHistory.patientAge),
                patientGender: caseHistory.patientGender,
                departmentId: caseHistory.departmentId || '',
                departmentName: caseHistory.departmentName || '',
                chiefComplaint: caseHistory.chiefComplaint,
                medicalHistory: caseHistory.medicalHistory,
                dentalHistory: caseHistory.dentalHistory,
                examinationFindings: caseHistory.examinationFindings,
                diagnosis: caseHistory.diagnosis,
                treatmentPlan: caseHistory.treatmentPlan,
                markedTeeth: caseHistory.markedTeeth || [],
                stagedObservations: caseHistory.stagedObservations || [],
                clinicalPhotos: caseHistory.clinicalPhotos || [],
            });
        } else {
            setEditingCaseHistoryId(null);
            setCaseFormData(initialCaseHistoryData);
        }
        setIsCaseFormOpen(true);
    };

    const handleCaseHistorySubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) { toast({ title: "Not logged in", variant: 'destructive'}); return; }
        if (!caseFormData.patientName || !caseFormData.diagnosis) {
            toast({ title: "Missing Fields", description: "Patient name and diagnosis are required.", variant: 'destructive'});
            return;
        }

        const dept = departments.find(d => d.id === caseFormData.departmentId);
        
        // Upload any pending photo files first
        let allPhotoUrls = [...caseFormData.clinicalPhotos];
        if (pendingPhotoFiles.length > 0) {
            setIsUploadingPhotos(true);
            const targetCaseId = editingCaseHistoryId || 'temp_' + Date.now();
            for (const file of pendingPhotoFiles) {
                const url = await uploadCasePhoto(user.uid, targetCaseId, file);
                if (url) allPhotoUrls.push(url);
            }
            setIsUploadingPhotos(false);
        }

        const payload = {
            ...caseFormData,
            clinicalPhotos: allPhotoUrls,
            studentId: user.uid,
            studentName: user.displayName || 'Student',
            departmentName: dept?.name || '',
            patientAge: Number(caseFormData.patientAge) || 0,
        };
        
        try {
            if (editingCaseHistoryId) {
                await updatePersonalCaseHistory(user.uid, editingCaseHistoryId, payload);
                toast({ title: "Case History Updated" });
            } else {
                await addPersonalCaseHistory(user.uid, payload);
                toast({ title: "Case History Saved" });
            }
            setIsCaseFormOpen(false);
            setEditingCaseHistoryId(null);
            setPendingPhotoFiles([]);
            setPendingPhotoUrls([]);
        } catch (error) {
            console.error("Error saving case history", error);
            toast({ title: "Error", description: "Could not save case history.", variant: 'destructive'});
        }
    }

    // ── Photo helpers ──
    const handlePhotoFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(f => {
            if (f.size > 5 * 1024 * 1024) {
                toast({ title: 'File too large', description: `"${f.name}" exceeds the 5 MB limit.`, variant: 'destructive' });
                return false;
            }
            if (!f.type.startsWith('image/')) {
                toast({ title: 'Invalid file', description: `"${f.name}" is not an image.`, variant: 'destructive' });
                return false;
            }
            return true;
        });
        if (validFiles.length === 0) return;
        setPendingPhotoFiles(prev => [...prev, ...validFiles]);
        const newUrls = validFiles.map(f => URL.createObjectURL(f));
        setPendingPhotoUrls(prev => [...prev, ...newUrls]);
        // Reset the input so the same file can be re-selected
        if (e.target) e.target.value = '';
    };

    const removePendingPhoto = (index: number) => {
        URL.revokeObjectURL(pendingPhotoUrls[index]);
        setPendingPhotoFiles(prev => prev.filter((_, i) => i !== index));
        setPendingPhotoUrls(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingPhoto = (index: number) => {
        setCaseFormData(prev => ({
            ...prev,
            clinicalPhotos: prev.clinicalPhotos.filter((_, i) => i !== index),
        }));
    };

    const handleCardPhotoUpload = async (caseId: string, e: ChangeEvent<HTMLInputElement>) => {
        if (!user) return;
        const files = Array.from(e.target.files || []);
        const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024 && f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        setUploadingForCaseId(caseId);
        const existingCase = caseHistories.find(c => c.id === caseId);
        const existingPhotos = existingCase?.clinicalPhotos || [];
        const newUrls: string[] = [];

        for (const file of validFiles) {
            const url = await uploadCasePhoto(user.uid, caseId, file);
            if (url) newUrls.push(url);
        }

        if (newUrls.length > 0) {
            await updatePersonalCaseHistory(user.uid, caseId, {
                clinicalPhotos: [...existingPhotos, ...newUrls],
            });
            toast({ title: 'Photos uploaded', description: `${newUrls.length} photo(s) added.` });
        }
        setUploadingForCaseId(null);
        if (e.target) e.target.value = '';
    };

    const openAddDeptDialog = (context: 'case' | 'attendance') => {
        setAddDeptContext(context);
        // Close the parent dialog to avoid nested dialog issues
        if (context === 'case') setIsCaseFormOpen(false);
        if (context === 'attendance') setIsAttendanceFormOpen(false);
        setNewDeptName('');
        setIsAddDeptDialogOpen(true);
    };

    const handleAddDepartment = async () => {
        const trimmedName = newDeptName.trim();
        if (!trimmedName) {
            toast({ title: "Missing Name", description: "Please enter a department name.", variant: 'destructive' });
            return;
        }
        if (!user) {
            toast({ title: "Not logged in", variant: 'destructive' });
            return;
        }
        try {
            const newId = await addPersonalDepartment(user.uid, trimmedName);

            toast({ title: "Department Added", description: `"${trimmedName}" has been created.` });
            setIsAddDeptDialogOpen(false);
            setNewDeptName('');
            if (newId) {
                if (addDeptContext === 'case') {
                    setCaseFormData(prev => ({...prev, departmentId: newId!}));
                    setIsCaseFormOpen(true);
                } else if (addDeptContext === 'attendance') {
                    setAttendanceDepartmentId(newId);
                    setIsAttendanceFormOpen(true);
                }
            }
            setAddDeptContext(null);
        } catch (error: any) {
            console.error("Error adding department", error);
            toast({ title: "Error Adding Department", description: error?.message || "Could not add department. Check your permissions.", variant: 'destructive'});
        }
    };

    const handleCancelAddDept = () => {
        setIsAddDeptDialogOpen(false);
        setNewDeptName('');
        // Re-open the parent dialog
        if (addDeptContext === 'case') setIsCaseFormOpen(true);
        if (addDeptContext === 'attendance') setIsAttendanceFormOpen(true);
        setAddDeptContext(null);
    };

     const handleDeleteCaseHistory = async () => {
        if (!caseHistoryToDelete || !user) return;
        try {
            await deletePersonalCaseHistory(user.uid, caseHistoryToDelete.id);
            toast({ title: "Case History Deleted" });
            setCaseHistoryToDelete(null);
        } catch (error) {
            console.error("Error deleting case history", error);
            toast({ title: "Error", description: "Could not delete case history.", variant: 'destructive' });
        }
    };


    const handleAttendanceSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user || !attendanceDepartmentId || !attendanceDate) {
             toast({ title: "Missing Fields", description: "Please select a department and date.", variant: 'destructive'});
             return;
        }
        
        const dept = departments.find(d => d.id === attendanceDepartmentId);
        if (!dept) {
            toast({ title: "Invalid Department", description: "The selected department could not be found.", variant: 'destructive'});
            return;
        }
        
        try {
            await setPersonalAttendance(user.uid, attendanceDate, 'Present', { departmentId: dept.id, departmentName: dept.name });
            toast({ title: "Attendance Marked", description: `Marked present for ${format(new Date(attendanceDate), 'dd/MM/yyyy')}.`});
            setIsAttendanceFormOpen(false);
        } catch(error) {
             console.error("Error marking attendance", error);
             toast({ title: "Error", description: "Could not mark attendance.", variant: 'destructive'});
        }
    }

    const handleFinanceSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!user) { toast({ title: "Not logged in", variant: 'destructive'}); return; }
        if (!financeFormData.description || !financeFormData.amount) {
            toast({ title: "Missing Fields", description: "Description and amount are required.", variant: 'destructive'});
            return;
        }
        
        const payload = {
            studentId: user.uid,
            type: financeFormData.type,
            description: financeFormData.description,
            amount: Number(financeFormData.amount),
            patientName: financeFormData.type === 'Receivable' ? financeFormData.patientName : '',
            date: format(new Date(), 'yyyy-MM-dd'),
        };
        
        try {
            await addPersonalFinance(user.uid, payload);
            toast({ title: "Financial Entry Added" });
            setIsFinanceFormOpen(false);
            setFinanceFormData(initialFinanceData);
        } catch (error) {
            console.error("Error saving finance entry", error);
            toast({ title: "Error", description: "Could not save entry.", variant: 'destructive'});
        }
    };
    
    const DayWithAttendance = ({ date }: { date: Date }) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayAttendance = attendance[dateStr];
        const isSelected = selectedCalendarDate === dateStr;
    
        return (
          <button
            type="button"
            onClick={() => setSelectedCalendarDate(prev => prev === dateStr ? null : dateStr)}
            className={cn(
              "relative w-full h-full flex items-center justify-center rounded-md transition-all",
              isSelected && "ring-2 ring-primary ring-offset-1",
              dayAttendance && "cursor-pointer",
              !dayAttendance && "cursor-default"
            )}
          >
            {format(date, 'd')}
            {dayAttendance && (
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-current" />
            )}
          </button>
        );
    };


    if (loading) {
        return <div>Loading academic data...</div>;
    }

    const attendanceStats = (() => {
        const daysInMonth = getDaysInMonth(summaryMonth);
        let present = 0;
        let absent = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth(), day);
            const dateStr = format(date, 'yyyy-MM-dd');
            if (attendance[dateStr]?.status === 'Present') present++;
            else if (attendance[dateStr]?.status === 'Absent') absent++;
        }
        return { present, absent };
    })();

    const financeSummary = (() => {
        const totalReceivable = finances.filter(f => f.type === 'Receivable').reduce((acc, curr) => acc + curr.amount, 0);
        const totalPayable = finances.filter(f => f.type === 'Payable').reduce((acc, curr) => acc + curr.amount, 0);
        const netBalance = totalReceivable - totalPayable;
        return { totalReceivable, totalPayable, netBalance };
    })();

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight flex items-center"><BookUser className="mr-3 h-8 w-8 text-special1" />My Academics</h1>
                {/* Always show lock badge — personal data is never affected by clinic membership */}
                <div className="flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800/60 dark:bg-purple-950/30 px-4 py-3 text-sm text-purple-700 dark:text-purple-300 max-w-sm">
                    <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Your personal records are always private</strong> — they are never shared with or overridden by any clinic.</span>
                </div>
                <div className="flex gap-2">
                     <Dialog open={isCaseFormOpen} onOpenChange={setIsCaseFormOpen}>
                        <DialogTrigger asChild><Button onClick={() => handleOpenCaseForm(null)}><PlusCircle className="mr-2 h-4 w-4" /> Add Case History</Button></DialogTrigger>
                        <DialogContent className="sm:max-w-5xl">
                            <DialogHeader><DialogTitle>{editingCaseHistoryId ? 'Edit Case History' : 'Add New Case History'}</DialogTitle></DialogHeader>
                            <form onSubmit={handleCaseHistorySubmit} className="space-y-6 max-h-[80vh] overflow-y-auto px-1 py-2 pr-4">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">All records are private to you.</p>
                                </div>

                                {/* Patient info */}
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b font-medium text-sm">
                                        <User className="h-4 w-4 text-primary" />
                                        Patient info
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                            <div className="md:col-span-2 space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Patient Name *</Label><Input value={caseFormData.patientName} onChange={e => setCaseFormData({...caseFormData, patientName: e.target.value})} required/></div>
                                            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Age</Label><Input type="number" value={caseFormData.patientAge} onChange={e => setCaseFormData({...caseFormData, patientAge: e.target.value})}/></div>
                                            <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Gender</Label><Select value={caseFormData.patientGender} onValueChange={(val) => setCaseFormData({...caseFormData, patientGender: val as any})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs text-muted-foreground font-semibold uppercase">Department</Label>
                                                <button type="button" className="text-xs text-primary hover:underline" onClick={() => openAddDeptDialog('case')}>+ Add Department</button>
                                            </div>
                                            <Select value={caseFormData.departmentId} onValueChange={val => setCaseFormData({...caseFormData, departmentId: val})}>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="Select department..."/></SelectTrigger>
                                                <SelectContent>
                                                    {departments.length === 0 && <p className="p-2 text-sm text-muted-foreground text-center">No departments yet</p>}
                                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Clinical history */}
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b font-medium text-sm">
                                        <FileText className="h-4 w-4 text-primary" />
                                        Clinical history
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Chief Complaint</Label><Textarea placeholder="Patient's primary concern in their own words..." value={caseFormData.chiefComplaint} onChange={e => setCaseFormData({...caseFormData, chiefComplaint: e.target.value})} className="min-h-[80px]" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Medical History</Label><Textarea placeholder="Systemic conditions, medications, allergies..." value={caseFormData.medicalHistory} onChange={e => setCaseFormData(prev => ({...prev, medicalHistory: e.target.value}))} className="min-h-[80px]" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Dental History</Label><Textarea placeholder="Previous treatments, extractions, habits..." value={caseFormData.dentalHistory} onChange={e => setCaseFormData(prev => ({...prev, dentalHistory: e.target.value}))} className="min-h-[80px]" /></div>
                                    </div>
                                </div>

                                {/* Examination and findings */}
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b font-medium text-sm">
                                        <Stethoscope className="h-4 w-4 text-primary" />
                                        Examination and findings
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Examination Findings</Label><Textarea placeholder="Extraoral, intraoral, soft tissue observations..." value={caseFormData.examinationFindings} onChange={e => setCaseFormData({...caseFormData, examinationFindings: e.target.value})} className="min-h-[80px]"/></div>
                                        
                                        <div className="border rounded-lg p-3 flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-sm font-semibold">Dental chart</h4>
                                                    <p className="text-xs text-muted-foreground">
                                                        {caseFormData.markedTeeth.length === 0 ? "No teeth marked yet" : `${caseFormData.markedTeeth.length} teeth marked`}
                                                    </p>
                                                </div>
                                                <Button type="button" variant="outline" size="sm" onClick={() => setIsChartExpanded(!isChartExpanded)}>
                                                    {isChartExpanded ? 'Close chart' : 'Open chart'}
                                                </Button>
                                            </div>
                                            {isChartExpanded && (
                                                <div className="pt-2 border-t mt-1">
                                                    <DentalChart 
                                                        markedTeeth={caseFormData.markedTeeth}
                                                        onTeethChange={(teeth) => setCaseFormData(prev => ({ ...prev, markedTeeth: teeth }))}
                                                        stagedObservations={caseFormData.stagedObservations}
                                                        onObservationsChange={(observations) => setCaseFormData(prev => ({...prev, stagedObservations: observations}))}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Diagnosis and plan */}
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b font-medium text-sm">
                                        <Clipboard className="h-4 w-4 text-primary" />
                                        Diagnosis and plan
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Diagnosis *</Label><Textarea placeholder="Clinical diagnosis based on history and examination..." value={caseFormData.diagnosis} onChange={e => setCaseFormData({...caseFormData, diagnosis: e.target.value})} required className="min-h-[80px]" /></div>
                                        <div className="space-y-1.5"><Label className="text-xs text-muted-foreground font-semibold uppercase">Treatment Plan</Label><Textarea placeholder="Proposed sequence of treatment..." value={caseFormData.treatmentPlan} onChange={e => setCaseFormData({...caseFormData, treatmentPlan: e.target.value})} className="min-h-[80px]"/></div>
                                    </div>
                                </div>

                                {/* Clinical photos */}
                                <div className="border rounded-xl bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b font-medium text-sm">
                                        <Camera className="h-4 w-4 text-primary" />
                                        Clinical photos
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Existing photos */}
                                        {caseFormData.clinicalPhotos.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground font-semibold uppercase">Saved photos</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {caseFormData.clinicalPhotos.map((url, i) => (
                                                        <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-border bg-muted">
                                                            <img src={url} alt={`Clinical photo ${i + 1}`} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExistingPhoto(i)}
                                                                className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Pending photos */}
                                        {pendingPhotoUrls.length > 0 && (
                                            <div className="space-y-2">
                                                <Label className="text-xs text-muted-foreground font-semibold uppercase">New photos (unsaved)</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {pendingPhotoUrls.map((url, i) => (
                                                        <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-muted">
                                                            <img src={url} alt={`New photo ${i + 1}`} className="w-full h-full object-cover" />
                                                            <button
                                                                type="button"
                                                                onClick={() => removePendingPhoto(i)}
                                                                className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Upload button */}
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            className="hidden"
                                            onChange={handlePhotoFileSelect}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => photoInputRef.current?.click()}
                                            className="gap-2"
                                        >
                                            <ImagePlus className="h-4 w-4" />
                                            Add photos
                                        </Button>
                                        <p className="text-xs text-muted-foreground">Max 5 MB per image. JPG, PNG, WebP supported.</p>
                                    </div>
                                </div>

                                <DialogFooter className="pt-6 mt-2">
                                    <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                    <Button type="submit" disabled={isUploadingPhotos}>
                                        {isUploadingPhotos ? 'Uploading photos...' : editingCaseHistoryId ? 'Save Changes' : 'Save case history'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Tabs defaultValue="cases" className="w-full">
                <div className="overflow-x-auto pb-2">
                    <TabsList>
                        <TabsTrigger value="cases"><ClipboardList className="mr-2 h-4 w-4"/>My Case Histories</TabsTrigger>
                        <TabsTrigger value="attendance"><CalendarDays className="mr-2 h-4 w-4"/>Manage Postings & Attendance</TabsTrigger>
                        <TabsTrigger value="finance"><DollarSign className="mr-2 h-4 w-4"/>My Finances</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="cases" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Submitted Case Histories</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {caseHistories.length === 0 && <p className="text-center p-4 text-muted-foreground">You have not submitted any case histories yet.</p>}
                            <Accordion type="single" collapsible className="space-y-3">
                                {caseHistories.map(ch => {
                                    const photos = ch.clinicalPhotos || [];
                                    return (
                                        <AccordionItem key={ch.id} value={ch.id} className="border rounded-xl overflow-hidden bg-card data-[state=open]:ring-1 data-[state=open]:ring-primary/30 transition-all">
                                            {/* Collapsed header — always visible */}
                                            <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 gap-3 [&>svg]:text-muted-foreground">
                                                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 text-left">
                                                    <span className="font-semibold text-base">{ch.patientName}</span>
                                                    {ch.departmentName && (
                                                        <Badge variant="outline" className="text-xs font-medium border-primary/40 text-primary">
                                                            {ch.departmentName}
                                                        </Badge>
                                                    )}
                                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <CalendarIcon className="h-3.5 w-3.5" />
                                                        {ch.createdAt ? format(ch.createdAt.toDate(), 'dd/MM/yyyy') : 'N/A'}
                                                    </span>
                                                    <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0">
                                                        <Check className="h-3 w-3" />
                                                        Submitted
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>

                                            {/* Expanded content */}
                                            <AccordionContent className="px-5 pb-5">
                                                <div className="space-y-5 pt-2">
                                                    {/* Diagnosis highlight */}
                                                    {ch.diagnosis && (
                                                        <div className="rounded-lg bg-muted/40 dark:bg-muted/20 p-4 border-l-4 border-primary">
                                                            <p className="text-xs font-semibold uppercase text-primary tracking-wider mb-1">Diagnosis</p>
                                                            <p className="font-medium text-foreground">{ch.diagnosis}</p>
                                                        </div>
                                                    )}

                                                    {/* Two-column grid: Complaint + Medical History */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {ch.chiefComplaint && (
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Chief Complaint</p>
                                                                <p className="text-sm text-foreground">{ch.chiefComplaint}</p>
                                                            </div>
                                                        )}
                                                        {ch.medicalHistory && (
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Medical History</p>
                                                                <p className="text-sm text-foreground">{ch.medicalHistory}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Two-column grid: Findings + Treatment Plan */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {ch.examinationFindings && (
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Examination Findings</p>
                                                                <p className="text-sm text-foreground">{ch.examinationFindings}</p>
                                                            </div>
                                                        )}
                                                        {ch.treatmentPlan && (
                                                            <div>
                                                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1">Treatment Plan</p>
                                                                <p className="text-sm text-foreground">{ch.treatmentPlan}</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Clinical Photos */}
                                                    <div>
                                                        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Clinical Photos</p>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {photos.slice(0, 2).map((url, i) => (
                                                                <button
                                                                    key={i}
                                                                    type="button"
                                                                    onClick={() => setPreviewPhotoUrl(url)}
                                                                    className="w-14 h-14 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
                                                                >
                                                                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                                                                </button>
                                                            ))}
                                                            {photos.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setPreviewPhotoUrl(photos[2])}
                                                                    className="w-14 h-14 rounded-lg border-2 border-border bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground hover:border-primary transition-colors"
                                                                >
                                                                    +{photos.length - 2}
                                                                </button>
                                                            )}
                                                            {/* Add photo button */}
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    multiple
                                                                    className="hidden"
                                                                    id={`card-photo-${ch.id}`}
                                                                    onChange={(e) => handleCardPhotoUpload(ch.id, e)}
                                                                />
                                                                <label
                                                                    htmlFor={`card-photo-${ch.id}`}
                                                                    className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                                                                >
                                                                    {uploadingForCaseId === ch.id ? (
                                                                        <span className="text-xs text-muted-foreground animate-pulse">...</span>
                                                                    ) : (
                                                                        <>
                                                                            <Camera className="h-4 w-4 text-muted-foreground" />
                                                                            <span className="text-[10px] text-muted-foreground mt-0.5">Add</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                            </div>
                                                            {photos.length === 0 && uploadingForCaseId !== ch.id && (
                                                                <span className="text-xs text-muted-foreground">No photos yet</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action buttons */}
                                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenCaseForm(ch)} className="gap-1.5">
                                                            <Edit className="h-3.5 w-3.5" />
                                                            Edit
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="outline" size="sm" onClick={() => setCaseHistoryToDelete(ch)} className="gap-1.5">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                    Delete
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete the case history for "{caseHistoryToDelete?.patientName}".</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={handleDeleteCaseHistory}>Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                        {(ch.markedTeeth?.length || 0) > 0 && (
                                                            <Button variant="outline" size="sm" onClick={() => handleOpenCaseForm(ch)} className="ml-auto gap-1.5 border-primary/40 text-primary hover:bg-primary/5">
                                                                View dental chart
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </CardContent>
                    </Card>

                    {/* Photo preview modal */}
                    {previewPhotoUrl && (
                        <Dialog open={!!previewPhotoUrl} onOpenChange={() => setPreviewPhotoUrl(null)}>
                            <DialogContent className="sm:max-w-2xl p-2">
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Photo Preview</DialogTitle>
                                </DialogHeader>
                                <img src={previewPhotoUrl} alt="Clinical photo preview" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" />
                            </DialogContent>
                        </Dialog>
                    )}
                </TabsContent>
                <TabsContent value="attendance" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Manage Postings & Attendance</CardTitle>
                            <CardDescription>Log your daily department posting and view your monthly attendance.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <Dialog open={isAttendanceFormOpen} onOpenChange={setIsAttendanceFormOpen}>
                                 <DialogTrigger asChild>
                                     <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/>Mark New Attendance</Button>
                                 </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
                                     <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                                        <div className="space-y-2"><Label>Date</Label><Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} required/></div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <Label>Department Posting</Label>
                                                <Button type="button" variant="outline" size="sm" onClick={() => openAddDeptDialog('attendance')} title="Add Department">
                                                    <PlusCircle className="mr-2 h-4 w-4" />
                                                    Add
                                                </Button>
                                            </div>
                                            <Select value={attendanceDepartmentId} onValueChange={setAttendanceDepartmentId} required>
                                                <SelectTrigger className="w-full"><SelectValue placeholder="Select department..."/></SelectTrigger>
                                                <SelectContent>
                                                    {departments.length === 0 && <p className="p-2 text-sm text-muted-foreground text-center">No departments yet</p>}
                                                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                            <Button type="submit">Mark as Present</Button>
                                        </DialogFooter>
                                     </form>
                                </DialogContent>
                             </Dialog>
                             
                            <div className="overflow-x-auto">
                                 <Card>
                                     <CardContent className="flex justify-center pt-6">
                                          <Calendar
                                            mode="single"
                                            month={summaryMonth}
                                            onMonthChange={setSummaryMonth}
                                            components={{ DayContent: DayWithAttendance }}
                                            modifiers={{
                                                present: (date) => attendance[format(date, 'yyyy-MM-dd')]?.status === 'Present',
                                                absent: (date) => attendance[format(date, 'yyyy-MM-dd')]?.status === 'Absent',
                                            }}
                                            modifiersClassNames={{
                                                present: cn('bg-green-100 dark:bg-green-800/50 text-green-800 dark:text-green-200 rounded-md'),
                                                absent: cn('bg-red-100 dark:bg-red-800/50 text-red-800 dark:text-red-200 rounded-md'),
                                            }}
                                            className="p-0"
                                        />
                                     </CardContent>
                                     <CardFooter className="flex flex-col gap-4">
                                        <div className="flex justify-around text-sm w-full">
                                            <div className="text-center">
                                                <p className="font-bold text-green-600">{attendanceStats.present}</p>
                                                <p>Present</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="font-bold text-red-600">{attendanceStats.absent}</p>
                                                <p>Absent</p>
                                            </div>
                                        </div>
                                        {selectedCalendarDate && attendance[selectedCalendarDate] && (
                                            <div className="w-full rounded-lg border bg-muted/50 p-4 space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                <p className="text-sm font-semibold text-muted-foreground">
                                                    {format(new Date(selectedCalendarDate + 'T00:00:00'), 'EEEE, dd MMMM yyyy')}
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant={attendance[selectedCalendarDate].status === 'Present' ? 'secondary' : 'destructive'} className={attendance[selectedCalendarDate].status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-800/50 dark:text-green-200' : ''}>
                                                        {attendance[selectedCalendarDate].status}
                                                    </Badge>
                                                    <span className="text-sm">Department: <strong>{attendance[selectedCalendarDate].departmentName}</strong></span>
                                                </div>
                                            </div>
                                        )}
                                        {selectedCalendarDate && !attendance[selectedCalendarDate] && (
                                            <div className="w-full rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-top-2 duration-200">
                                                <p>No attendance recorded for {format(new Date(selectedCalendarDate + 'T00:00:00'), 'dd MMMM yyyy')}.</p>
                                            </div>
                                        )}
                                     </CardFooter>
                                 </Card>
                             </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="finance" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Student Finances</CardTitle>
                            <CardDescription>Track amounts you need to pay or are due to you for academic activities.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-600">Total Receivable</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">₹{financeSummary.totalReceivable.toLocaleString()}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-600">Total Payable</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">₹{financeSummary.totalPayable.toLocaleString()}</p></CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Net Balance</CardTitle></CardHeader>
                                    <CardContent><p className="text-2xl font-bold">₹{financeSummary.netBalance.toLocaleString()}</p></CardContent>
                                </Card>
                            </div>

                            <Dialog open={isFinanceFormOpen} onOpenChange={setIsFinanceFormOpen}>
                                <DialogTrigger asChild><Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add New Entry</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add Financial Entry</DialogTitle></DialogHeader>
                                    <form onSubmit={handleFinanceSubmit} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Entry Type</Label>
                                            <Select value={financeFormData.type} onValueChange={(val) => setFinanceFormData(prev => ({...prev, type: val as any}))}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Receivable">Receivable (e.g., Amount due from patient)</SelectItem>
                                                    <SelectItem value="Payable">Payable (e.g., Lab bill, consumables)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {financeFormData.type === 'Receivable' && (
                                            <div className="space-y-2"><Label>Patient Name (Optional)</Label><Input value={financeFormData.patientName} onChange={e => setFinanceFormData(prev => ({...prev, patientName: e.target.value}))}/></div>
                                        )}
                                        <div className="space-y-2"><Label>Description *</Label><Input value={financeFormData.description} onChange={e => setFinanceFormData(prev => ({...prev, description: e.target.value}))} required/></div>
                                        <div className="space-y-2"><Label>Amount (₹) *</Label><Input type="number" value={financeFormData.amount} onChange={e => setFinanceFormData(prev => ({...prev, amount: e.target.value}))} required/></div>
                                        <DialogFooter>
                                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                            <Button type="submit">Add Entry</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                            
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Patient</TableHead><TableHead className="text-right">Amount (₹)</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {finances.map(f => (
                                            <TableRow key={f.id}>
                                                <TableCell>{format(new Date(f.date), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell><Badge variant={f.type === 'Receivable' ? 'secondary' : 'destructive'}>{f.type}</Badge></TableCell>
                                                <TableCell>{f.description}</TableCell>
                                                <TableCell>{f.patientName || 'N/A'}</TableCell>
                                                <TableCell className="text-right font-medium">₹{f.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {finances.length === 0 && <p className="text-center p-4 text-muted-foreground">No financial entries yet.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isAddDeptDialogOpen} onOpenChange={setIsAddDeptDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Department</DialogTitle>
                        <DialogDescription>Create a new department for your clinic.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Department Name</Label>
                            <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="e.g. Periodontics" autoFocus />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={handleCancelAddDept}>Cancel</Button>
                        <Button onClick={handleAddDepartment} disabled={!newDeptName.trim()}>Add Department</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
