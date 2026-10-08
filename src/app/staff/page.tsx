'use client';

import { useState, type FormEvent, useEffect, useRef, useMemo } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { ClinicSetupAlert } from "@/components/ClinicSetupAlert";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { StaffMember, AttendanceStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { PersonStanding, PlusCircle, Trash2, Edit, CalendarCheck, CalendarX, CalendarIcon, ChevronLeft, ChevronRight, Search, Phone, Mail, X, CheckCircle2, XCircle } from "lucide-react";
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
  const { user, clinicId, loading, clinicLoading } = useUser();
  const noClinic = user && !clinicId && !loading && !clinicLoading;

  const db = useFirestore();
  const { toast } = useToast();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
          createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : undefined,
          updatedAt: data.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt) : undefined,
        } as StaffMember;
      });
      setStaff(fetched);

      // ensure attendance listeners exist for each staff and cleanup removed staff listeners
      const currentIds = fetched.map(f => f.id);
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

      fetched.forEach(member => {
        if (!attendanceUnsubsRef.current[member.id]) {
          const attCol = collection(db, 'clinics', clinicId, 'staff', member.id, 'attendance');
          const unsubAtt = onSnapshot(attCol, (attSnap) => {
            const map: Record<string, AttendanceStatus> = {};
            attSnap.docs.forEach(docSnap => {
              const d = docSnap.data() as any;
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
      for (const k of Object.keys(attendanceUnsubsRef.current)) {
        attendanceUnsubsRef.current[k]?.();
      }
      attendanceUnsubsRef.current = {};
    };
  }, [db, user, clinicId, toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentMember(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value: StaffMember['role']) => {
    setCurrentMember(prev => ({ ...prev, role: value }));
  };

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
  };

  const handleDayClick: DayClickEventHandler = async (day) => {
    if (!summaryMember || isAfter(day, new Date()) || !clinicId) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const currentStatus = attendance[summaryMember.id]?.[dateStr];

    let newStatus: AttendanceStatus | undefined;
    if (currentStatus === 'Present') {
      newStatus = 'Absent';
    } else if (currentStatus === 'Absent') {
      newStatus = undefined;
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
    
    const lastDayToCount = isBefore(endOfMonth, todayDate) ? daysInMonth : todayDate.getDate();
    const daysInCurrentView = isSameDay(startOfMonth(todayDate), summaryMonth) ? lastDayToCount : daysInMonth;

    return { present, absent, unmarked: Math.max(0, daysInCurrentView - totalMarked) };
  };

  const stats = getAttendanceStatsForMonth();

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staff;
    const q = searchQuery.toLowerCase();
    return staff.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      (m.contactNumber && m.contactNumber.toLowerCase().includes(q)) ||
      (m.email && m.email.toLowerCase().includes(q))
    );
  }, [staff, searchQuery]);

  if (noClinic) return <ClinicSetupAlert sectionName="Staff" />;

  return (
    <div className="space-y-4 sm:space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 no-print">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center">
          <PersonStanding className="mr-2 sm:mr-3 h-7 w-7 sm:h-8 sm:w-8 text-info" />
          Staff Management
        </h1>

        <Dialog open={isFormOpen} onOpenChange={(isOpen) => {
          setIsFormOpen(isOpen);
          if (!isOpen) {
            setEditingMemberId(null);
            setCurrentMember(initialFormData);
          }
        }}>
          <DialogTrigger asChild>
            <Button
              onClick={() => { setEditingMemberId(null); setCurrentMember(initialFormData); setIsFormOpen(true); }}
              disabled={!clinicId}
              className="h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
            >
              <PlusCircle className="mr-1.5 sm:mr-2 h-4 w-4" /> Add Staff Member
            </Button>
          </DialogTrigger>

          {/* Compact Add/Edit Staff Modal */}
          <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-xl max-h-[92vh] rounded-2xl sm:rounded-xl p-3.5 sm:p-6 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
            <DialogHeader className="shrink-0 pb-3 border-b border-border/60">
              <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <PersonStanding className="h-4 w-4 text-info" />
                {editingMemberId ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter team member contact information, position, and role responsibilities.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-1 sm:px-2 py-3 sm:py-4 space-y-3 sm:space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <Label htmlFor="name" className="text-xs sm:text-sm font-medium">Full Name *</Label>
                    <Input id="name" name="name" value={currentMember.name} onChange={handleInputChange} placeholder="e.g., Riya Sharma" required className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="role" className="text-xs sm:text-sm font-medium">Role *</Label>
                    <Select name="role" value={currentMember.role} onValueChange={handleSelectChange} required>
                      <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm mt-1"><SelectValue placeholder="Select Role" /></SelectTrigger>
                      <SelectContent>
                        {(['Receptionist', 'Dental Assistant', 'Hygienist', 'Office Manager', 'Other'] as StaffMember['role'][]).map(r => (
                          <SelectItem key={r} value={r} className="text-xs sm:text-sm">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  <div>
                    <Label htmlFor="contactNumber" className="text-xs sm:text-sm font-medium">Contact Number</Label>
                    <Input id="contactNumber" name="contactNumber" value={currentMember.contactNumber || ''} onChange={handleInputChange} placeholder="e.g., 555-0201" className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs sm:text-sm font-medium">Email Address</Label>
                    <Input id="email" name="email" type="email" value={currentMember.email || ''} onChange={handleInputChange} placeholder="e.g., staff@clinic.com" className="h-8 sm:h-9 text-xs sm:text-sm mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs sm:text-sm font-medium">Responsibilities / Notes</Label>
                  <Textarea id="description" name="description" value={currentMember.description || ''} onChange={handleInputChange} placeholder="Briefly describe key duties or shift notes..." className="min-h-[60px] text-xs sm:text-sm mt-1" />
                </div>
              </div>

              <DialogFooter className="px-1 pt-3 border-t shrink-0 flex flex-row items-center justify-end gap-2 bg-background">
                <DialogClose asChild>
                  <Button type="button" variant="outline" className="h-8 sm:h-9 text-xs sm:text-sm">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="h-8 sm:h-9 text-xs sm:text-sm">
                  {editingMemberId ? 'Save Changes' : 'Add Member'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Attendance Calendar & Monthly Summary Modal */}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-md max-h-[92vh] rounded-2xl sm:rounded-xl p-3.5 sm:p-5 flex flex-col gap-0 shadow-2xl border border-border/80 overflow-hidden">
          <DialogHeader className="shrink-0 pb-2.5 border-b border-border/60">
            <DialogTitle className="text-sm sm:text-base font-semibold truncate">
              Attendance: {summaryMember?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tap a date to toggle: Present → Absent → Clear
            </DialogDescription>
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setSummaryMonth(prev => subMonths(prev, 1))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs sm:text-sm font-semibold">{format(summaryMonth, 'MMMM yyyy')}</span>
              <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setSummaryMonth(prev => addMonths(prev, 1))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2.5 space-y-3">
            <div className="flex justify-center">
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
                  present: 'bg-green-100 dark:bg-green-900/60 text-green-700 dark:text-green-300 font-semibold rounded-md',
                  absent: 'bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 font-semibold rounded-md',
                }}
                className="p-0 scale-95 sm:scale-100 origin-top"
              />
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center mb-2">Monthly Breakdown</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-1.5">
                  <p className="font-bold text-green-600 dark:text-green-400 text-base leading-none">{stats.present}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Present</p>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-1.5">
                  <p className="font-bold text-red-600 dark:text-red-400 text-base leading-none">{stats.absent}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Absent</p>
                </div>
                <div className="bg-muted border border-border/60 rounded-lg p-1.5">
                  <p className="font-bold text-muted-foreground text-base leading-none">{stats.unmarked}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Unmarked</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2.5 border-t shrink-0 flex flex-row justify-end">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-8 text-xs">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Direct Search Bar (No redundant banners) */}
      {staff.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search staff by name, role, contact, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 sm:h-10 text-xs sm:text-sm bg-card border-border/80"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Staff Card Grid */}
      {staff.length === 0 ? (
        <Card className="rounded-xl border border-dashed border-border/80">
          <CardContent className="p-8 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-info/10 text-info">
              <PersonStanding className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No staff members yet</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your receptionists, assistants, hygienists, and managers to track attendance.
            </p>
            <Button size="sm" onClick={() => { setEditingMemberId(null); setCurrentMember(initialFormData); setIsFormOpen(true); }} disabled={!clinicId} className="h-8 text-xs">
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Add Staff Member
            </Button>
          </CardContent>
        </Card>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-border/80 bg-muted/20">
          <p className="text-sm font-medium text-muted-foreground">No staff match your search "{searchQuery}"</p>
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="mt-2 text-xs">
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStaff.map(member => {
            const todayAttendance = attendance[member.id]?.[today];

            return (
              <div
                key={member.id}
                className="rounded-xl border border-border/80 bg-card shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Level 1: Staff Member Header & Attendance Badge */}
                <div className="p-3.5 sm:p-4 pb-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">
                        {member.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-normal">
                          {member.role}
                        </Badge>
                      </div>
                    </div>

                    {/* Today's Status Badge */}
                    {todayAttendance === 'Present' ? (
                      <Badge className="shrink-0 text-[10px] sm:text-xs px-2 py-0.5 bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 gap-1 hover:bg-green-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Present Today
                      </Badge>
                    ) : todayAttendance === 'Absent' ? (
                      <Badge className="shrink-0 text-[10px] sm:text-xs px-2 py-0.5 bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 gap-1 hover:bg-red-500/20">
                        <XCircle className="h-3 w-3" /> Absent Today
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs px-2 py-0.5 text-muted-foreground border-border/80">
                        Not Marked
                      </Badge>
                    )}
                  </div>

                  {/* Level 2: Nested Staff Details Container */}
                  <div className="mt-3 rounded-lg bg-muted/40 border border-border/50 p-2.5 sm:p-3 space-y-1.5 text-xs text-foreground/90">
                    {member.description && (
                      <p className="text-[11px] sm:text-xs text-muted-foreground italic line-clamp-2 pb-1 border-b border-border/40">
                        "{member.description}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0 text-info/80" />
                      <span className="truncate">{member.contactNumber || 'No phone number'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0 text-info/80" />
                      <span className="truncate">{member.email || 'No email address'}</span>
                    </div>
                  </div>
                </div>

                {/* Level 3: Attendance Actions & Management Bar */}
                <div className="px-3.5 sm:px-4 py-2.5 bg-muted/20 border-t border-border/50 flex flex-col gap-2">
                  {/* Quick Attendance Toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={todayAttendance === 'Present' ? 'default' : 'outline'}
                      className={`h-7 sm:h-8 text-xs font-medium ${todayAttendance === 'Present' ? 'bg-green-600 hover:bg-green-700 text-white' : 'hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400'}`}
                      onClick={() => handleMarkAttendance(member.id, 'Present')}
                    >
                      <CalendarCheck className="mr-1 h-3.5 w-3.5" /> Present
                    </Button>
                    <Button
                      size="sm"
                      variant={todayAttendance === 'Absent' ? 'default' : 'outline'}
                      className={`h-7 sm:h-8 text-xs font-medium ${todayAttendance === 'Absent' ? 'bg-red-600 hover:bg-red-700 text-white' : 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400'}`}
                      onClick={() => handleMarkAttendance(member.id, 'Absent')}
                    >
                      <CalendarX className="mr-1 h-3.5 w-3.5" /> Absent
                    </Button>
                  </div>

                  {/* Secondary Management Row */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => openSummary(member)}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-primary" /> Calendar
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEdit(member)}>
                        <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setMemberToDelete(member)}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="w-[calc(100%-1.25rem)] max-w-[calc(100%-1.25rem)] sm:max-w-md rounded-2xl sm:rounded-xl p-4 sm:p-6">
                          <AlertDialogHeaderCustom>
                            <AlertDialogTitleCustom className="text-base sm:text-lg">Remove Staff Member?</AlertDialogTitleCustom>
                            <AlertDialogDescriptionCustom className="text-xs sm:text-sm">
                              This action cannot be undone. This will permanently remove {memberToDelete?.name} from the staff list.
                            </AlertDialogDescriptionCustom>
                          </AlertDialogHeaderCustom>
                          <AlertDialogFooterCustom className="gap-2 sm:gap-0 mt-3 sm:mt-4">
                            <AlertDialogCancel onClick={() => setMemberToDelete(null)} className="h-8 text-xs sm:h-9 sm:text-sm">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="h-8 text-xs sm:h-9 sm:text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooterCustom>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
