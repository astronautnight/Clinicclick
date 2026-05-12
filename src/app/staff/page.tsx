

'use client';

import { useState, type FormEvent, useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StaffMember, AttendanceStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PersonStanding, PlusCircle, Trash2, Edit, CalendarCheck, CalendarX, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionCustom, AlertDialogFooter as AlertDialogFooterCustom, AlertDialogHeader as AlertDialogHeaderCustom, AlertDialogTitle as AlertDialogTitleCustom, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, addMonths, subMonths, getDaysInMonth, isSameDay, isAfter, isBefore } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import type { DayClickEventHandler } from 'react-day-picker';
import {
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    setAttendance as setAttendanceService
  } from '@/services/staff-service';
  


const initialFormData: Omit<StaffMember, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  role: 'Other',
  description: '',
  contactNumber: '',
  email: '',
};

export default function StaffPage() {
    const { user, clinicId } = useUser();
    const db = useFirestore();
    const { toast } = useToast();

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [currentMember, setCurrentMember] = useState(initialFormData);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<StaffMember | null>(null);

    // attendance[staffId] = { '2025-11-20': 'Present', ... }
    const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({});

    const today = format(new Date(), 'yyyy-MM-dd');

    const [isSummaryOpen, setIsSummaryOpen] = useState(false);
    const [summaryMember, setSummaryMember] = useState<StaffMember | null>(null);
    const [summaryMonth, setSummaryMonth] = useState(startOfMonth(new Date()));

    // Keep refs to unsubscribe functions for attendance subcollections
    const attendanceUnsubsRef = useRef<Record<string, () => void>>({});

    // Load staff collection and set up listeners
    useEffect(() => {
      if (!db || !user || !clinicId) return;

      const staffColRef = collection(db, 'clinics', clinicId, 'staff');
      const q = query(staffColRef, orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const fetched: StaffMember[] = snap.docs.map(d => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name,
            role: data.role,
            description: data.description,
            contactNumber: data.contactNumber,
            email: data.email,
            createdAt: data.createdAt ? data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt : undefined,
            updatedAt: data.updatedAt ? data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt : undefined,
          } as StaffMember;
        });
        setStaff(fetched);

        // ensure attendance listeners exist for each staff and cleanup removed staff listeners
        const currentIds = fetched.map(f => f.id);
        // remove unsub for staff no longer present
        for (const id of Object.keys(attendanceUnsubsRef.current)) {
          if (!currentIds.includes(id)) {
            attendanceUnsubsRef.current[id]?.();
            delete attendanceUnsubsRef.current[id];
            setAttendance(prev => {
              const copy = { ...prev };
              delete copy[id];
              return copy;
            });
          }
        }

        // attach listeners for newly added staff
        fetched.forEach(member => {
          if (!attendanceUnsubsRef.current[member.id]) {
            const attCol = collection(db, 'clinics', clinicId, 'staff', member.id, 'attendance');
            const unsubAtt = onSnapshot(attCol, (attSnap) => {
              const map: Record<string, AttendanceStatus> = {};
              attSnap.docs.forEach(docSnap => {
                const d = docSnap.data() as any;
                // doc id could be yyyy-mm-dd or the document may contain a date field
                const id = docSnap.id;
                const dateStr = typeof d.date === 'string' ? d.date : id;
                if (d.status === 'Present' || d.status === 'Absent') {
                  map[dateStr] = d.status;
                }
              });
              setAttendance(prev => ({ ...prev, [member.id]: map }));
            }, (err) => {
              console.warn('attendance listener error', err);
            });
            attendanceUnsubsRef.current[member.id] = unsubAtt;
          }
        });

      }, (err) => {
        console.error("Failed to listen staff collection:", err);
        toast({ title: "Error", description: "Could not load staff list.", variant: "destructive" });
      });

      return () => {
        unsub();
        // cleanup attendance listeners
        for (const k of Object.keys(attendanceUnsubsRef.current)) {
          attendanceUnsubsRef.current[k]?.();
        }
        attendanceUnsubsRef.current = {};
      };
    }, [db, user, clinicId, toast]);

    // input handlers
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setCurrentMember(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: StaffMember['role']) => {
        setCurrentMember(prev => ({ ...prev, role: value }));
    };

    // CRUD - staff
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user || !db || !clinicId) {
            toast({ title: "Error", description: "You must be logged in to a clinic.", variant: "destructive" });
            return;
        }
        if (!currentMember.name || !currentMember.role) {
            toast({ title: "Error", description: "Staff member name and role are required.", variant: "destructive" });
            return;
        }

        try {
          if (editingMemberId) {
            await updateStaffMember(clinicId, editingMemberId, currentMember);
            toast({ title: "Staff Member Updated", description: "The staff member's details have been updated." });
          } else {
            await addStaffMember(clinicId, currentMember);
            toast({ title: "Staff Member Added", description: `${currentMember.name} has been added to the team.` });
          }
          setIsFormOpen(false);
          setEditingMemberId(null);
          setCurrentMember(initialFormData);
        } catch (err) {
          console.error('error saving staff', err);
          toast({ title: "Error", description: "Could not save staff member.", variant: "destructive" });
        }
    };

    const handleEdit = (member: StaffMember) => {
        setEditingMemberId(member.id);
        setCurrentMember({
            name: member.name,
            role: member.role,
            description: member.description,
            contactNumber: member.contactNumber,
            email: member.email,
        });
        setIsFormOpen(true);
    };

    const handleDelete = async () => {
        if (!user || !db || !memberToDelete || !clinicId) return;
        try {
          await deleteStaffMember(clinicId, memberToDelete.id);
          toast({ title: "Staff Member Removed", description: `${memberToDelete.name} has been removed from the team.` });
          setMemberToDelete(null);
        } catch (err) {
          console.error('error deleting staff', err);
          toast({ title: "Error", description: "Could not delete staff member.", variant: "destructive" });
        }
    };

    const handleMarkAttendance = async (staffId: string, status: AttendanceStatus) => {
        if (!clinicId) return;
        try {
            await setAttendanceService(clinicId, staffId, today, status);
            toast({ title: "Attendance Marked", description: `${status} for today.` });
        } catch (err) {
            toast({ title: "Error", description: "Could not mark attendance.", variant: "destructive" });
        }
    }
    
    // Calendar day click handler (for summary modal)
    const handleDayClick: DayClickEventHandler = async (day) => {
        if (!summaryMember || isAfter(day, new Date()) || !clinicId) return; // don't mark future
        const dateStr = format(day, 'yyyy-MM-dd');
        const currentStatus = attendance[summaryMember.id]?.[dateStr];

        // cycle: undefined -> Present -> Absent -> undefined
        let newStatus: AttendanceStatus | undefined;
        if (currentStatus === 'Present') {
          newStatus = 'Absent';
        } else if (currentStatus === 'Absent') {
          newStatus = undefined; // This will clear the attendance
        } else {
          newStatus = 'Present';
        }

        try {
            await setAttendanceService(clinicId, summaryMember.id, dateStr, newStatus);
            if (newStatus) {
                toast({ title: "Attendance Updated", description: `Attendance for ${format(day, 'PPP')} marked as ${newStatus}.` });
            } else {
                toast({ title: "Attendance Cleared", description: `Attendance for ${format(day, 'PPP')} has been cleared.` });
            }
        } catch (err) {
            toast({ title: "Error", description: "Could not update attendance.", variant: "destructive" });
        }
    };

    const openSummary = (member: StaffMember) => {
        setSummaryMember(member);
        setSummaryMonth(startOfMonth(new Date()));
        setIsSummaryOpen(true);
    };

    const getAttendanceStatsForMonth = () => {
        if (!summaryMember) return { present: 0, absent: 0, unmarked: 0 };

        const memberAttendance = attendance[summaryMember.id] || {};
        const daysInMonth = getDaysInMonth(summaryMonth);
        let present = 0;
        let absent = 0;
        
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth(), day);
            const dateStr = format(date, 'yyyy-MM-dd');
            if (memberAttendance[dateStr] === 'Present') {
                present++;
            } else if (memberAttendance[dateStr] === 'Absent') {
                absent++;
            }
        }
        const totalMarked = present + absent;
        
        const todayDate = new Date();
        const endOfMonth = new Date(summaryMonth.getFullYear(), summaryMonth.getMonth() + 1, 0);
        
        // Only count days up to today if this is current month
        const lastDayToCount = isBefore(endOfMonth, todayDate) ? daysInMonth : todayDate.getDate();
        const daysInCurrentView = isSameDay(startOfMonth(todayDate), summaryMonth) ? lastDayToCount : daysInMonth;

        return { present, absent, unmarked: daysInCurrentView - totalMarked };
    };

    const stats = getAttendanceStatsForMonth();

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                    <PersonStanding className="mr-3 h-8 w-8 text-info" />
                    Staff Management
                </h1>
                <Button onClick={() => { setEditingMemberId(null); setCurrentMember(initialFormData); setIsFormOpen(true); }} disabled={!clinicId}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Staff Member
                </Button>
            </div>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
                setIsFormOpen(isOpen);
                if (!isOpen) {
                    setEditingMemberId(null);
                    setCurrentMember(initialFormData);
                }
            }}>
                <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>{editingMemberId ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                        <DialogDescription>Fill in the details for the staff member.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="name">Full Name *</Label>
                                    <Input id="name" name="name" value={currentMember.name} onChange={handleInputChange} placeholder="e.g., Riya Sharma" required />
                                </div>
                                <div>
                                    <Label htmlFor="role">Role *</Label>
                                    <Select name="role" value={currentMember.role} onValueChange={handleSelectChange} required>
                                        <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                                        <SelectContent>{(['Receptionist', 'Dental Assistant', 'Hygienist', 'Office Manager', 'Other'] as StaffMember['role'][]).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="contactNumber">Contact Number</Label>
                                    <Input id="contactNumber" name="contactNumber" value={currentMember.contactNumber || ''} onChange={handleInputChange} placeholder="e.g., 555-0201" />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={currentMember.email || ''} onChange={handleInputChange} placeholder="e.g., riya.sharma@clinic.com" />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="description">Description / Responsibilities</Label>
                                <Textarea id="description" name="description" value={currentMember.description || ''} onChange={handleInputChange} placeholder="Briefly describe their main duties."/>
                            </div>
                        </div>
                        <DialogFooter className="pt-4 border-t">
                            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                            <Button type="submit">{editingMemberId ? 'Save Changes' : 'Add Member'}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

             <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Attendance for {summaryMember?.name}</DialogTitle>
                        <DialogDescription>Click a day to mark attendance.</DialogDescription>
                        <div className="flex items-center justify-center pt-2">
                            <Button variant="outline" size="icon" onClick={() => setSummaryMonth(prev => subMonths(prev, 1))}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="w-48 text-center font-semibold">{format(summaryMonth, 'MMMM yyyy')}</span>
                            <Button variant="outline" size="icon" onClick={() => setSummaryMonth(prev => addMonths(prev, 1))}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Calendar
                            month={summaryMonth}
                            onMonthChange={setSummaryMonth}
                            onDayClick={handleDayClick}
                            disabled={{ after: new Date() }}
                            modifiers={{
                                present: (date) => attendance[summaryMember?.id || '']?.[format(date, 'yyyy-MM-dd')] === 'Present',
                                absent: (date) => attendance[summaryMember?.id || '']?.[format(date, 'yyyy-MM-dd')] === 'Absent',
                            }}
                            modifiersClassNames={{
                                present: 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-md',
                                absent: 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-md',
                            }}
                            className="p-0"
                        />
                         <Card>
                            <CardHeader className="p-4">
                                <CardTitle className="text-base">Monthly Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex justify-around text-sm">
                                    <div className="text-center">
                                        <p className="font-bold text-green-600">{stats.present}</p>
                                        <p>Present</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-yellow-600">{stats.absent}</p>
                                        <p>Absent</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-muted-foreground">{stats.unmarked}</p>
                                        <p>Unmarked</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {staff.map(member => {
                    const todayAttendance = attendance[member.id]?.[today];

                    return (
                    <Card key={member.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <CardTitle>{member.name}</CardTitle>
                                {todayAttendance ? (
                                     <Badge variant={todayAttendance === 'Present' ? 'default' : 'destructive'} className={todayAttendance === 'Present' ? `bg-green-100 text-green-700` : `bg-red-100 text-red-700`}>
                                        {todayAttendance}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">Not Marked</Badge>
                                )}
                            </div>
                            <CardDescription className="text-primary font-semibold">{member.role}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-2 text-sm">
                            <p className="text-muted-foreground">{member.description || 'No description provided.'}</p>
                            <div className="pt-2">
                                {member.contactNumber && <p><strong>Contact:</strong> {member.contactNumber}</p>}
                                {member.email && <p><strong>Email:</strong> {member.email}</p>}
                            </div>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-2 border-t pt-4 mt-auto">
                            <div className="flex justify-between gap-2">
                                <Button className="flex-1 bg-green-500 hover:bg-green-600" size="sm" onClick={() => handleMarkAttendance(member.id, 'Present')}>
                                    <CalendarCheck className="mr-1 h-4 w-4" /> Present
                                </Button>
                                <Button className="flex-1 bg-yellow-500 hover:bg-yellow-600" size="sm" onClick={() => handleMarkAttendance(member.id, 'Absent')}>
                                    <CalendarX className="mr-1 h-4 w-4" /> Absent
                                </Button>
                            </div>
                             <div className="flex flex-wrap justify-between items-center gap-2 pt-2 mt-2 border-t">
                                <Button variant="outline" size="sm" onClick={() => openSummary(member)}>
                                    <CalendarIcon className="mr-1 h-4 w-4" /> View Attendance
                                </Button>
                                
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => handleEdit(member)}>
                                        <Edit className="mr-1 h-4 w-4" /> Edit
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm" onClick={() => setMemberToDelete(member)}>
                                                <Trash2 className="mr-1 h-4 w-4" /> Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeaderCustom>
                                                <AlertDialogTitleCustom>Are you sure?</AlertDialogTitleCustom>
                                                <AlertDialogDescriptionCustom>
                                                    This action cannot be undone. This will permanently remove {memberToDelete?.name} from the staff list.
                                                </AlertDialogDescriptionCustom>
                                            </AlertDialogHeaderCustom>
                                            <AlertDialogFooterCustom>
                                                <AlertDialogCancel onClick={() => setMemberToDelete(null)}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                            </AlertDialogFooterCustom>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                )})}
            </div>
             {staff.length === 0 && (
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground">No staff members have been added yet. Click "Add Staff Member" to build your team list.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
