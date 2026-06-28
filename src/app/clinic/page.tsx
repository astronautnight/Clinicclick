
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

import { useUser, useFirestore } from '@/firebase';
import {
  approveClinicRequest,
  joinClinicWithCode,
  regenerateInviteCode,
  rejectClinicRequest,
  updateMemberRole,
  removeClinicMember,
  createClinic,
  updateClinic,
  deleteClinic,
} from '@/services/clinic-service';
import { addOperatory, deleteOperatory, assignPatientToOperatory, clearOperatory } from '@/services/operatory-service';
import type { Patient, Operatory } from '@/types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { MoreVertical, Edit, Hospital, Copy, Trash2, UserPlus, User, Share2, Mail, MessageCircle, MessageSquare, MapPin, Phone, Users, CheckCircle2 } from 'lucide-react';
import { getUserProfile } from '@/services/auth-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Label } from '@/components/ui/label';

/* ============================================================
   TYPES
============================================================ */
type Member = {
  uid: string;
  role: 'admin' | 'member';
  displayName: string;
};

type JoinRequest = {
  uid: string;
  displayName: string;
};

/* ============================================================
   PAGE
============================================================ */
export default function ClinicPage() {
  const { user, clinicId, clinicRole } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [editingClinicName, setEditingClinicName] = useState('');
  const [editingClinicAddress, setEditingClinicAddress] = useState('');
  const [editingClinicPhone, setEditingClinicPhone] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicType, setNewClinicType] = useState<'General' | 'Specialist' | 'Multi-specialty'>('General');

  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [newOperatoryName, setNewOperatoryName] = useState('');
  const [isAddingOperatory, setIsAddingOperatory] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLastMember = members.length === 1;

  /* ============================================================
     LOAD CLINIC DATA
  ============================================================ */
  useEffect(() => {
    if (!clinicId || !db || isLeaving || isDeleting) return;

    const clinicDocRef = doc(db, 'clinics', clinicId);

    const unsubClinic = onSnapshot(clinicDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setClinicName(data.name || '');
            setClinicAddress(data.address || '');
            setClinicPhone(data.phone || '');
            setInviteCode(data.inviteCode || '');
        }
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: clinicDocRef.path,
            operation: 'get',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    const membersColRef = collection(db, 'clinics', clinicId, 'members');
    const unsubMembers = onSnapshot(
      membersColRef,
      async (snap) => {
          const memberData = await Promise.all(snap.docs.map(async (d) => {
              const profile = await getUserProfile(d.id);
              return {
                uid: d.id,
                displayName: profile?.displayName || d.id,
                ...(d.data() as any),
              };
          }));
          setMembers(memberData);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
          path: membersColRef.path,
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );
    
    const requestsColRef = collection(db, 'clinics', clinicId, 'pendingRequests');
    const unsubRequests = onSnapshot(
      requestsColRef,
      async (snap) => {
          const requestData = await Promise.all(snap.docs.map(async (d) => {
              const profile = await getUserProfile(d.id);
              return {
                  uid: d.id,
                  displayName: profile?.displayName || d.id
              };
          }));
          setRequests(requestData);
      },
      (error) => {
        const permissionError = new FirestorePermissionError({
            path: requestsColRef.path,
            operation: 'list',
          });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    const operatoriesColRef = collection(db, 'clinics', clinicId, 'operatories');
    const unsubOperatories = onSnapshot(query(operatoriesColRef, orderBy('createdAt')), (snap) => {
        const opsData = snap.docs.map(d => ({ id: d.id, ...d.data() } as Operatory));
        setOperatories(opsData);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: operatoriesColRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    const patientsColRef = collection(db, 'clinics', clinicId, 'patients');
    const unsubPatients = onSnapshot(patientsColRef, (snapshot) => {
        const patientsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
        setPatients(patientsData);
    }, (error) => {
        const permissionError = new FirestorePermissionError({
            path: patientsColRef.path,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return () => {
      unsubClinic();
      unsubMembers();
      unsubRequests();
      unsubOperatories();
      unsubPatients();
    };
  }, [clinicId, db, isLeaving, isDeleting]);

  /* ============================================================
     ACTIONS
  ============================================================ */

  const handleCreateClinic = async () => {
    if (!user) return;
  
    if (clinicId) {
      toast({
        title: 'You are already part of a clinic',
        variant: 'destructive',
      });
      return;
    }
  
    if (!newClinicName.trim()) {
      toast({
        title: 'Clinic name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!newClinicAddress.trim()) {
      toast({
        title: 'Clinic address is required',
        variant: 'destructive',
      });
      return;
    }

    if (!newClinicPhone.trim()) {
      toast({
        title: 'Phone number is required',
        variant: 'destructive',
      });
      return;
    }
  
    try {
      await createClinic({
        ownerUid: user.uid,
        clinicName: newClinicName.trim(),
        address: newClinicAddress.trim(),
        phone: newClinicPhone.trim(),
        clinicType: newClinicType,
      });
  
      toast({ title: 'Clinic created successfully' });
  
      // 🔥 FORCE UI TO UPDATE
      window.location.reload();
  
    } catch (e: any) {
      toast({
        title: e.message || 'Failed to create clinic',
        variant: 'destructive',
      });
    }
  };
  

  const handleJoinClinic = async () => {
    if (!user || !joinCode.trim()) return;

    setJoining(true);
    try {
      await joinClinicWithCode({
        userId: user.uid,
        inviteCode: joinCode.trim(),
      });
      toast({ title: 'Request sent. Waiting for admin approval.' });
    } catch (e: any) {
      toast({ title: e.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  const acceptRequest = async (uid: string) => {
    if (!clinicId) return;

    await approveClinicRequest({
      clinicId,
      userId: uid,
      role: 'member',
    });

    toast({ title: 'Member approved' });
  };

  const rejectRequest = async (uid: string) => {
    if (!clinicId) return;
    await rejectClinicRequest({ clinicId, userId: uid });
    toast({ title: 'Request rejected' });
  };

  const handleSaveClinicName = async () => {
    if (!clinicId || !editingClinicName.trim() || clinicRole !== 'admin') return;
    setIsSavingName(true);
    try {
        await updateClinic(clinicId, { 
            name: editingClinicName.trim(),
            address: editingClinicAddress.trim(),
            phone: editingClinicPhone.trim()
        });
        toast({ title: 'Clinic details updated successfully' });
        setIsEditingName(false);
    } catch (error: any) {
        toast({ title: "Error", description: error.message || "Could not update clinic name", variant: "destructive" });
    } finally {
        setIsSavingName(false);
    }
  };
  
  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: 'Invite code copied!' });
  };

  const handleAddOperatory = async () => {
    if (!newOperatoryName.trim() || !clinicId) return;
    setIsAddingOperatory(true);
    try {
      await addOperatory(clinicId, newOperatoryName.trim());
      toast({ title: 'Operatory Added' });
      setNewOperatoryName('');
    } catch (e: any) {
      toast({ title: e.message || 'Failed to add operatory', variant: 'destructive' });
    } finally {
      setIsAddingOperatory(false);
    }
  };

  const handleAssignPatient = async (operatoryId: string, patientId: string) => {
    if (!clinicId) return;
    if (patientId === 'clear') {
        await clearOperatory(clinicId, operatoryId);
        toast({ title: 'Operatory cleared' });
        return;
    }
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    await assignPatientToOperatory(clinicId, operatoryId, patient.id, `${patient.firstName} ${patient.lastName}`);
    toast({ title: 'Patient Assigned' });
  };

  const handleLeaveClinic = async () => {
    if (!clinicId || !user) return;
    try {
      setIsLeaving(true);
      // Wait for React to run effect cleanup
      await new Promise(resolve => setTimeout(resolve, 0));
      await removeClinicMember({ clinicId, userId: user.uid });
      toast({ title: 'You have left the clinic.' });
    } catch (e: any) {
      setIsLeaving(false);
      toast({ title: e.message || 'Failed to leave clinic', variant: 'destructive' });
    }
  };

  const handleDeleteClinic = async () => {
    if (!clinicId || !user) return;
    try {
      setIsDeleting(true);
      // Wait for React to run effect cleanup
      await new Promise(resolve => setTimeout(resolve, 0));
      await deleteClinic({ clinicId, userId: user.uid });
      toast({ title: 'Clinic deleted successfully.' });
    } catch (e: any) {
      setIsDeleting(false);
      toast({ title: e.message || 'Failed to delete clinic', variant: 'destructive' });
    }
  };

  /* ============================================================
     NO CLINIC STATE
  ============================================================ */
  if (!clinicId) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto py-6 px-4">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight flex items-center justify-center gap-3 text-slate-900 dark:text-white">
              <Hospital className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Set Up Your Clinic
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
              Get started by creating a new clinic workspace, or enter an invite code to join an existing clinic.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-8 items-stretch mt-8">
            {/* Create Clinic Card */}
            <Card className="flex flex-col justify-between border shadow-md hover:shadow-lg transition-shadow duration-300">
              <div>
                <CardHeader>
                  <CardTitle className="text-xl">Create Clinic</CardTitle>
                  <CardDescription>Register a new clinic workspace as an administrator.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-clinic-name" className="text-sm font-semibold">Clinic Name</Label>
                    <Input
                      id="create-clinic-name"
                      placeholder="e.g. Pearls Dental Clinic"
                      value={newClinicName}
                      onChange={e => setNewClinicName(e.target.value)}
                      className="w-full border border-input focus-visible:ring-2 focus-visible:ring-ring h-10 px-3 rounded-md"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-clinic-address" className="text-sm font-semibold">Clinic Address / City</Label>
                    <Input
                      id="create-clinic-address"
                      placeholder="e.g. Bandra West, Mumbai"
                      value={newClinicAddress}
                      onChange={e => setNewClinicAddress(e.target.value)}
                      className="w-full border border-input focus-visible:ring-2 focus-visible:ring-ring h-10 px-3 rounded-md"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-clinic-phone" className="text-sm font-semibold">Phone Number</Label>
                    <Input
                      id="create-clinic-phone"
                      placeholder="e.g. +91 98765 43210"
                      value={newClinicPhone}
                      onChange={e => setNewClinicPhone(e.target.value)}
                      className="w-full border border-input focus-visible:ring-2 focus-visible:ring-ring h-10 px-3 rounded-md"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-clinic-type" className="text-sm font-semibold">Clinic Type</Label>
                    <Select
                      value={newClinicType}
                      onValueChange={(val: any) => setNewClinicType(val)}
                    >
                      <SelectTrigger id="create-clinic-type" className="w-full border border-input h-10 px-3 rounded-md">
                        <SelectValue placeholder="Select clinic type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General">General Practice</SelectItem>
                        <SelectItem value="Specialist">Specialist Practice</SelectItem>
                        <SelectItem value="Multi-specialty">Multi-specialty Clinic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </div>
              <CardFooter className="pt-4 border-t mt-4">
                <Button
                  onClick={handleCreateClinic}
                  className="w-full h-10 font-medium"
                >
                  Create Clinic
                </Button>
              </CardFooter>
            </Card>

            {/* Divider */}
            <div className="flex lg:flex-col items-center justify-center gap-4 py-6 lg:py-0">
              <div className="h-px w-full lg:h-full lg:w-px bg-slate-200 dark:bg-slate-800 flex-1" />
              <span className="text-xs font-bold text-muted-foreground bg-slate-50 dark:bg-slate-900 px-3 py-1.5 border rounded-full shadow-sm">OR</span>
              <div className="h-px w-full lg:h-full lg:w-px bg-slate-200 dark:bg-slate-800 flex-1" />
            </div>

            {/* Join Clinic Card */}
            <Card className="flex flex-col justify-between border shadow-md hover:shadow-lg transition-shadow duration-300">
              <div>
                <CardHeader>
                  <CardTitle className="text-xl">Join Clinic</CardTitle>
                  <CardDescription>Request access to join an existing clinic workspace.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="join-invite-code" className="text-sm font-semibold">Invite Code</Label>
                    <Input
                      id="join-invite-code"
                      placeholder="e.g. 8-digit code"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                      className="w-full border border-input focus-visible:ring-2 focus-visible:ring-ring h-10 px-3 rounded-md"
                    />
                  </div>
                </CardContent>
              </div>
              <CardFooter className="pt-4 border-t mt-4">
                <Button 
                  onClick={handleJoinClinic} 
                  disabled={joining} 
                  className="w-full h-10 font-medium"
                  variant="outline"
                >
                  {joining ? 'Requesting…' : 'Request to Join'}
                </Button>
              </CardFooter>
            </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     CLINIC VIEW
  ============================================================ */
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Hospital className="mr-3 h-8 w-8 text-indigo-500" />
        My Clinic
      </h1>

      {/* CLINIC INFO */}
      <Card className="overflow-hidden border shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 dark:border-[#3D3D3D] dark:bg-[#2A2A2A]">
        <CardContent className="p-0">
            {/* Top row: Name, Icon, Active Badge, Edit, Menu */}
            <div className="flex justify-between items-start p-6 pb-5">
                <div className="flex gap-4 items-center">
                    {/* Placeholder Icon */}
                    <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:bg-[#E3F2FD] dark:border-transparent dark:text-blue-500">
                        <Hospital className="h-8 w-8" />
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            {isEditingName ? (
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <Input value={editingClinicName} onChange={(e) => setEditingClinicName(e.target.value)} disabled={isSavingName} placeholder="Clinic Name" className="h-8 text-lg font-semibold w-64 dark:bg-[#1A1A1A] dark:border-[#4A4A4A] dark:text-white" />
                                        <Button size="sm" onClick={handleSaveClinicName} disabled={isSavingName}>{isSavingName ? 'Saving...' : 'Save'}</Button>
                                        <Button size="sm" variant="outline" onClick={() => setIsEditingName(false)} disabled={isSavingName} className="dark:border-[#4A4A4A] dark:text-[#E0E0E0] dark:bg-transparent">Cancel</Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input value={editingClinicAddress} onChange={(e) => setEditingClinicAddress(e.target.value)} disabled={isSavingName} placeholder="Address" className="h-8 text-sm w-48 dark:bg-[#1A1A1A] dark:border-[#4A4A4A] dark:text-white" />
                                        <Input value={editingClinicPhone} onChange={(e) => setEditingClinicPhone(e.target.value)} disabled={isSavingName} placeholder="Phone" className="h-8 text-sm w-40 dark:bg-[#1A1A1A] dark:border-[#4A4A4A] dark:text-white" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{clinicName}</h1>
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-[#E8F5E9] dark:hover:bg-[#E8F5E9] dark:text-[#2E7D32] font-medium border-green-200 dark:border-transparent rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Active
                                    </Badge>
                                </>
                            )}
                        </div>
                        {!isEditingName && (
                            <div className="flex items-center text-sm text-slate-500 dark:text-[#A0A0A0] gap-4 mt-1.5 font-medium">
                                <span className="flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-slate-400 dark:text-[#A0A0A0]" /> {clinicAddress || 'Add Address'}</span>
                                <span className="flex items-center"><Phone className="h-4 w-4 mr-1.5 text-slate-400 dark:text-[#A0A0A0]" /> {clinicPhone || 'Add Phone Number'}</span>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {clinicRole === 'admin' && !isEditingName && (
                        <Button variant="outline" size="icon" onClick={() => {
                            setEditingClinicName(clinicName);
                            setEditingClinicAddress(clinicAddress);
                            setEditingClinicPhone(clinicPhone);
                            setIsEditingName(true);
                        }} className="h-9 w-9 text-slate-500 rounded-lg dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A]">
                            <Edit className="h-4 w-4" />
                        </Button>
                    )}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 rounded-lg dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A]">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
                            {clinicRole === 'admin' && (
                                <DropdownMenuItem onClick={() => {
                                    setEditingClinicName(clinicName);
                                    setEditingClinicAddress(clinicAddress);
                                    setEditingClinicPhone(clinicPhone);
                                    setIsEditingName(true);
                                }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Details
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Middle row: Invite code and Requests */}
            <div className="flex flex-col md:flex-row border-t border-slate-200 dark:border-[#4A4A4A]">
                <div className="flex-1 p-6 md:border-r border-slate-200 dark:border-[#4A4A4A]">
                    <Label className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-[#A0A0A0] uppercase mb-3 block">Invite code — Share with doctors to join</Label>
                    <div className="flex items-center gap-2">
                        <div className="h-9 px-4 flex items-center justify-center font-mono text-sm font-bold tracking-widest border border-slate-200 dark:border-transparent rounded-md bg-slate-50 dark:bg-[#1A1A1A] text-slate-900 dark:text-white">{inviteCode}</div>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCopyInviteCode}
                            aria-label="Copy invite code"
                            className="h-9 px-3 text-slate-600 hover:text-slate-900 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:text-white dark:hover:bg-[#3A3A3A]"
                        >
                            <Copy className="h-4 w-4"/>
                        </Button>
                        {clinicRole === 'admin' && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                    if (!clinicId) return;
                                    const code = await regenerateInviteCode(clinicId);
                                    setInviteCode(code);
                                    toast({ title: 'Invite code regenerated' });
                                }}
                                className="h-9 font-medium text-slate-600 hover:text-slate-900 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:text-white dark:hover:bg-[#3A3A3A]"
                            >
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2"><path d="M1.84998 7.49998C1.84998 4.66458 4.05979 2.28987 6.89998 1.9231V0.916122C3.50495 1.28827 0.849976 4.12214 0.849976 7.49998C0.849976 10.8778 3.50495 13.7117 6.89998 14.0838V13.0768C4.05979 12.7101 1.84998 10.3354 1.84998 7.49998ZM14.15 7.49998C14.15 10.8778 11.495 13.7117 8.09998 14.0838V13.0768C10.9402 12.7101 13.15 10.3354 13.15 7.49998C13.15 4.66458 10.9402 2.28987 8.09998 1.9231V0.916122C11.495 1.28827 14.15 4.12214 14.15 7.49998Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path><path d="M8.09998 0V3L10.5 1.5L8.09998 0Z" fill="currentColor"></path><path d="M6.89998 15V12L4.5 13.5L6.89998 15Z" fill="currentColor"></path></svg>
                                Regenerate
                            </Button>
                        )}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" aria-label="Share invite code" className="h-9 font-medium text-slate-600 hover:text-slate-900 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:text-white dark:hover:bg-[#3A3A3A]">
                                    <Share2 className="h-4 w-4 mr-2" /> Share
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
                                <DropdownMenuItem onClick={() => {
                                    const msg = `Hello Doctor,\n\nYou have been invited to join our clinic on ClinicClick.\n\nYour invite code is: *${inviteCode}*\n\nPlease visit clinicatclick.com or download the ClinicClick app from the Play Store:\nhttps://play.google.com/store/apps/details?id=com.clinicclick.app\n\nAfter signing up, navigate to 'Join Clinic' and enter your invite code.`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                                }}>
                                    <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    const subject = "Join our Clinic on ClinicClick";
                                    const msg = `Hello Doctor,\n\nYou have been invited to join our clinic on ClinicClick.\n\nYour invite code is: ${inviteCode}\n\nPlease visit clinicatclick.com or download the ClinicClick app from the Play Store:\nhttps://play.google.com/store/apps/details?id=com.clinicclick.app\n\nAfter signing up, navigate to 'Join Clinic' and enter your invite code.`;
                                    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`, '_blank');
                                }}>
                                    <Mail className="h-4 w-4 mr-2" /> Email (Gmail)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    const msg = `Hello Doctor,\n\nYou have been invited to join our clinic on ClinicClick.\n\nYour invite code is: ${inviteCode}\n\nPlease visit clinicatclick.com or download the ClinicClick app from the Play Store:\nhttps://play.google.com/store/apps/details?id=com.clinicclick.app\n\nAfter signing up, navigate to 'Join Clinic' and enter your invite code.`;
                                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                                    const separator = isIOS ? '&' : '?';
                                    window.open(`sms:${separator}body=${encodeURIComponent(msg)}`, '_blank');
                                }}>
                                    <MessageSquare className="h-4 w-4 mr-2" /> Messages (SMS)
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                <div className="p-6 md:min-w-[280px] flex items-center justify-between gap-6">
                    <div>
                        <Label className="text-[11px] font-bold tracking-widest text-slate-400 dark:text-[#A0A0A0] uppercase block mb-1">Pending Requests</Label>
                        {requests.length > 0 ? (
                            <div className="text-sm font-semibold text-blue-600 dark:text-[#60A5FA] flex items-center gap-1.5">
                                {requests.length} awaiting approval
                            </div>
                        ) : (
                            <div className="text-sm font-medium text-slate-500">None</div>
                        )}
                    </div>
                    {clinicRole === 'admin' && requests.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="outline" className="h-9 font-medium text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-[#1E3A8A] dark:bg-[#172554] dark:hover:bg-[#1E3A8A] dark:text-[#93C5FD]">
                                    <Users className="h-4 w-4 mr-2" />
                                    Review
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[300px] p-2 dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
                                <div className="text-xs font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">Join Requests</div>
                                {requests.map(r => (
                                    <div key={r.uid} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50 dark:hover:bg-[#3A3A3A]">
                                        <span className="font-semibold text-sm dark:text-white">{r.displayName}</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" className="h-7 text-xs px-3 bg-green-600 hover:bg-green-700" onClick={() => acceptRequest(r.uid)}>Accept</Button>
                                            <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40" onClick={() => rejectRequest(r.uid)}>Reject</Button>
                                        </div>
                                    </div>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Bottom row: Action Buttons */}
            <div className="p-4 px-6 border-t border-slate-200 dark:border-[#4A4A4A] flex justify-between items-center bg-white dark:bg-transparent rounded-b-lg">
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => window.location.href='/patients'} className="font-medium shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A] dark:hover:text-white dark:hover:border-[#6A6A6A] transition-colors">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add patient
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href='/doctors'} className="font-medium shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A] dark:hover:text-white dark:hover:border-[#6A6A6A] transition-colors">
                        <Hospital className="mr-2 h-4 w-4" />
                        Add doctor
                    </Button>
                </div>
                <div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="font-medium shadow-sm text-slate-500 hover:text-red-600 hover:border-red-300 hover:bg-red-50 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-red-900/40 dark:hover:text-red-400 dark:hover:border-red-800 transition-colors">
                                <Trash2 className="h-4 w-4 mr-2" />
                                {isLastMember ? 'Delete clinic' : 'Leave clinic'}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
                            <AlertDialogHeader>
                                <AlertDialogTitle>
                                {isLastMember ? 'Delete Clinic?' : 'Leave Clinic?'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    {isLastMember
                                    ? 'You are the last member. Deleting will permanently remove the clinic and all its data (patients, appointments, transactions, etc.). This action cannot be undone.'
                                    : 'Are you sure you want to leave this clinic? You will need an invite code to rejoin later.'}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                onClick={isLastMember ? handleDeleteClinic : handleLeaveClinic}
                                className={isLastMember ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                                >
                                {isLastMember ? 'Delete Permanently' : 'Leave'}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>
        </CardContent>
      </Card>

      {/* OPERATORIES */}
      <Card>
        <CardHeader>
          <CardTitle>Operatories / Chairs</CardTitle>
          <CardDescription>Manage your clinic's operatories and assign patients.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clinicRole === 'admin' && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="New operatory name (e.g., Chair 1)"
                value={newOperatoryName}
                onChange={(e) => setNewOperatoryName(e.target.value)}
                disabled={isAddingOperatory}
              />
              <Button onClick={handleAddOperatory} disabled={isAddingOperatory || !newOperatoryName.trim()}>
                {isAddingOperatory ? 'Adding...' : 'Add'}
              </Button>
            </div>
          )}
          <div className="space-y-2">
            {operatories.length === 0 ? (
              <p className="text-muted-foreground">No operatories added yet.</p>
            ) : (
              operatories.map(op => (
                <div key={op.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                  <div>
                    <span className="font-medium">{op.name}</span>
                    <Badge variant={op.status === 'Occupied' ? 'destructive' : 'secondary'} className="ml-2">
                      {op.status === 'Occupied' ? `Occupied: ${op.currentPatientName}` : 'Available'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select onValueChange={(patientId) => handleAssignPatient(op.id, patientId)} value={op.currentPatientId || 'clear'}>
                        <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Assign Patient" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="clear">-- Clear (Set to Available) --</SelectItem>
                            {patients.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {clinicRole === 'admin' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the operatory "{op.name}".</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={async () => {
                                    if (!clinicId) return;
                                    await deleteOperatory(clinicId, op.id);
                                    toast({ title: 'Operatory Deleted', variant: 'destructive' });
                                }}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* MEMBERS */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {members.map(m => (
            <div key={m.uid} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
              <div>
                <span className="font-medium">{m.displayName}</span>
                {m.uid === user?.uid && <span className="text-xs text-primary ml-2">(You)</span>}
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>{m.role}</Badge>

                {clinicRole === 'admin' && m.uid !== user?.uid && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!clinicId) return;
                          updateMemberRole({
                            clinicId,
                            userId: m.uid,
                            role: m.role === 'admin' ? 'member' : 'admin',
                          })
                        }}
                      >
                        {m.role === 'admin'
                          ? 'Demote to Member'
                          : 'Promote to Admin'}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                            if (!clinicId) return;
                            removeClinicMember({
                                clinicId,
                                userId: m.uid,
                            })
                        }}
                      >
                        Remove member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
  );
}
