
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, query, orderBy, where, getCountFromServer, updateDoc, serverTimestamp } from 'firebase/firestore';

import { useUser, useFirestore } from '@/firebase';
import {
  approveClinicRequest,
  joinClinicWithCode,
  regenerateInviteCode,
  rejectClinicRequest,
  updateMemberRole,
  updateMemberJobRole,
  removeClinicMember,
  createClinic,
  updateClinic,
  deleteClinic,
} from '@/services/clinic-service';
import { addOperatory, deleteOperatory, assignPatientToOperatory, clearOperatory } from '@/services/operatory-service';
import type { Patient, Operatory, Doctor } from '@/types';

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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

import { MoreVertical, Edit, Hospital, Copy, Trash2, UserPlus, User, Share2, Mail, MessageCircle, MessageSquare, MapPin, Phone, Users, CheckCircle2, Camera, Medal, Tag, Calendar, UserCheck, AlertTriangle } from 'lucide-react';
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
  jobRole?: 'Doctor' | 'Receptionist' | 'Dental Assistant' | 'Hygienist' | 'Office Manager' | 'Other';
  email?: string;
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
  const [logoUrl, setLogoUrl] = useState('');
  const [activeDates, setActiveDates] = useState<string[]>([]);
  const [isFounder, setIsFounder] = useState<boolean>(false);
  const [founderCount, setFounderCount] = useState<number>(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [editingClinicName, setEditingClinicName] = useState('');
  const [editingClinicAddress, setEditingClinicAddress] = useState('');
  const [editingClinicPhone, setEditingClinicPhone] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [requestedRole, setRequestedRole] = useState('');

  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicType, setNewClinicType] = useState<'General' | 'Specialist' | 'Multi-specialty'>('General');

  const [members, setMembers] = useState<Member[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [operatories, setOperatories] = useState<Operatory[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
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
        setLogoUrl(data.logoUrl || '');
        setActiveDates(data.activeDates || []);
        setIsFounder(data.isFounder || false);
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
            email: profile?.email || undefined,
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

    const doctorsColRef = collection(db, 'clinics', clinicId, 'doctors');
    const unsubDoctors = onSnapshot(doctorsColRef, (snapshot) => {
      const doctorsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Doctor));
      setDoctors(doctorsData);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: doctorsColRef.path,
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
      unsubDoctors();
    };
  }, [clinicId, db, isLeaving, isDeleting]);

  // Fetch founder count to display spots left
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'clinics'), where('isFounder', '==', true));
    getCountFromServer(q).then(snap => {
      setFounderCount(snap.data().count);
    }).catch(console.error);
  }, [db, isFounder]); // refresh if this clinic becomes a founder

  // Check and claim founder slot if eligible
  useEffect(() => {
    if (!db || !clinicId || isFounder || founderCount >= 100) return;
    
    const activeDaysCount = activeDates.length;
    const patientsCount = patients.length;
    const doctorsCount = doctors.filter(d => d.doctorType === 'activedoctor').length;

    if (activeDaysCount >= 10 && patientsCount >= 10 && doctorsCount >= 2) {
      updateDoc(doc(db, 'clinics', clinicId), {
        isFounder: true,
        founderJoinedAt: serverTimestamp()
      }).catch(console.error);
    }
  }, [db, clinicId, isFounder, founderCount, activeDates.length, patients.length, doctors.length]);

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
    if (!requestedRole) {
      toast({ title: 'Please select a role', variant: 'destructive' });
      return;
    }

    setJoining(true);
    try {
      await joinClinicWithCode({
        userId: user.uid,
        inviteCode: joinCode.trim(),
        requestedRole: requestedRole,
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

  const compressImage = (file: File, maxSizeBytes: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Scale down if dimensions are large
        const MAX_DIM = 512;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively reduce JPEG quality until under maxSizeBytes
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > maxSizeBytes * 1.37 && quality > 0.1) {
          // 1.37 factor accounts for base64 overhead (~37%)
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };
      img.src = url;
    });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !clinicId) return;

    // Validate is image
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, SVG, etc.).",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      let base64String: string;
      const maxSize = 200 * 1024; // 200 KB

      if (file.size > maxSize) {
        // Compress the image to fit under 200 KB
        base64String = await compressImage(file, maxSize);
      } else {
        // Small enough — read as-is
        base64String = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Could not read image file"));
          reader.readAsDataURL(file);
        });
      }

      await updateClinic(clinicId, { logoUrl: base64String });
      toast({ title: "Logo uploaded successfully" });
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message || "Could not save logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!clinicId) return;
    try {
      await updateClinic(clinicId, { logoUrl: "" });
      toast({ title: "Logo removed successfully" });
    } catch (err: any) {
      toast({
        title: "Remove failed",
        description: err.message || "Could not remove logo",
        variant: "destructive",
      });
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
                    placeholder="e.g. Dental Clinic"
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
                <div className="space-y-1.5 mt-4">
                  <Label htmlFor="join-role" className="text-sm font-semibold">What is your role of joining the clinic? <span className="text-red-500">*</span></Label>
                  <Select value={requestedRole} onValueChange={setRequestedRole}>
                    <SelectTrigger id="join-role" className="w-full border border-input h-10 px-3 rounded-md">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doctor"><span className="text-blue-600 font-medium">Doctor</span></SelectItem>
                      <SelectItem value="Receptionist"><span className="text-purple-600 font-medium">Receptionist</span></SelectItem>
                      <SelectItem value="Dental Assistant"><span className="text-emerald-600 font-medium">Dental Assistant</span></SelectItem>
                      <SelectItem value="Hygienist"><span className="text-teal-600 font-medium">Hygienist</span></SelectItem>
                      <SelectItem value="Office Manager"><span className="text-indigo-600 font-medium">Office Manager</span></SelectItem>
                      <SelectItem value="Other"><span className="text-slate-600 font-medium">Other</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </div>
            <CardFooter className="pt-4 border-t mt-4">
              <Button
                onClick={handleJoinClinic}
                disabled={joining || !requestedRole || !joinCode.trim()}
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

  const activeDaysCount = activeDates.length;
  const patientsCount = patients.length;
  const doctorsCount = doctors.filter(d => d.doctorType === 'activedoctor').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const isTodayActive = activeDates.includes(todayStr);

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

  /* ============================================================
     CLINIC VIEW
  ============================================================ */
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight flex items-center justify-between">
        <div className="flex items-center">
          <Hospital className="mr-3 h-8 w-8 text-indigo-500" />
          My Clinic
        </div>
      </h1>

      {/* CLINIC INFO */}
      <Card className="overflow-hidden border shadow-sm shadow-slate-200/50 dark:shadow-slate-900/50 dark:border-[#3D3D3D] dark:bg-[#2A2A2A]">
        <CardContent className="p-0">
          {/* Top row: Name, Icon, Active Badge, Edit, Menu */}
          <div className="flex justify-between items-start p-6 pb-5">
            <div className="flex gap-4 items-center">
              {/* Clinic Logo / Placeholder Icon */}
              <div className="relative group h-16 w-16 shrink-0">
                <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center border border-blue-100 overflow-hidden dark:bg-[#E3F2FD] dark:border-transparent dark:text-blue-500">
                  {logoUrl ? (
                    <img src={logoUrl} alt={`${clinicName} logo`} className="h-full w-full object-cover" />
                  ) : (
                    <Hospital className="h-8 w-8" />
                  )}
                </div>
                {clinicRole === 'admin' && (
                  <>
                    <label
                      htmlFor="logo-upload-input"
                      className="absolute inset-0 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      title="Upload logo (max 200KB)"
                    >
                      <Camera className="h-5 w-5" />
                    </label>
                    <input
                      id="logo-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      disabled={isUploadingLogo}
                      className="sr-only"
                    />
                  </>
                )}
              </div>
              <div>
                <div className="mb-1">
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">{clinicName}</h1>
                      <div className="flex flex-wrap items-center gap-2">
                       {isTodayActive ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-[#E8F5E9] dark:hover:bg-[#E8F5E9] dark:text-[#2E7D32] font-medium border-green-200 dark:border-transparent rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </Badge>
                      ) : (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 dark:bg-[#3D3D3D] dark:hover:bg-[#3D3D3D] dark:text-[#E0E0E0] font-medium border-slate-200 dark:border-transparent rounded-full px-2.5 py-0.5 flex items-center gap-1.5 shadow-sm cursor-pointer hover:scale-105 transition-all">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
                              Inactive
                            </Badge>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[480px] w-[95vw] p-6 bg-white dark:bg-[#1A1A1A] rounded-2xl border border-slate-200 dark:border-[#333] shadow-xl">
                            <DialogHeader>
                              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Clinic is Inactive Today
                              </DialogTitle>
                              <DialogDescription className="text-sm text-slate-500 dark:text-[#A0A0A0] mt-1">
                                Your clinic is currently marked as inactive for today. Follow these instructions to record active days and qualify for the Founder Program.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-[#D0D0D0]">
                              <p className="font-semibold text-slate-800 dark:text-white">How to maintain an active clinic:</p>
                              <ul className="list-disc pl-5 space-y-2">
                                <li>
                                  <strong className="text-slate-800 dark:text-white">Schedule appointments:</strong> Add a patient appointment to your calendar.
                                </li>
                                <li>
                                  <strong className="text-slate-800 dark:text-white">Add patient records:</strong> Register a new patient in the system.
                                </li>
                                <li>
                                  <strong className="text-slate-800 dark:text-white">Generate invoices:</strong> Record a transaction or issue a billing invoice.
                                </li>
                              </ul>
                              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 p-3 rounded-lg text-amber-800 dark:text-amber-300 text-xs">
                                💡 Completing any of these daily operations automatically registers the current day as active under the Founder Program progress.
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      <Dialog>
                        <DialogTrigger asChild>
                          <button className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold shadow-sm transition-all hover:scale-105 border ${founderTier !== 'None' ? currentTierInfo.color + ' border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-[#2A2A2A] dark:text-[#E0E0E0] dark:border-[#4A4A4A] dark:hover:bg-[#3A3A3A]'}`}>
                            <Medal className="h-4 w-4" style={{ color: founderTier !== 'None' ? currentTierInfo.iconColor : 'currentColor' }} />
                            {founderTier !== 'None' ? currentTierInfo.label : 'Unlock Founder'}
                          </button>
                        </DialogTrigger>
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
                      </div>
                    </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 rounded-lg dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A]">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-[#2A2A2A] dark:border-[#3D3D3D]">
                  {clinicRole === 'admin' && (
                    <>
                      <DropdownMenuItem onClick={() => {
                        setEditingClinicName(clinicName);
                        setEditingClinicAddress(clinicAddress);
                        setEditingClinicPhone(clinicPhone);
                        setIsEditingName(true);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      {logoUrl && (
                        <DropdownMenuItem onClick={handleRemoveLogo} className="text-red-600 hover:text-red-700 dark:text-red-400">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Logo
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Middle row: Invite code and Requests */}
          <div className="flex flex-col md:flex-row border-t border-slate-200 dark:border-[#4A4A4A]">
            <div className="flex-1 p-6 md:border-r border-slate-200 dark:border-[#4A4A4A]">
              <Label className="text-[11px] font-bold tracking-widest uppercase mb-3 block" style={{ backgroundImage: 'linear-gradient(to right, #ef4444, #3b82f6, #10b981, #eab308)', WebkitBackgroundClip: 'text', color: 'transparent' }}>Invite code - Share with your associate dentists and team to let them join.</Label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-9 px-4 flex items-center justify-center font-mono text-sm font-bold tracking-widest border border-slate-200 dark:border-transparent rounded-md bg-slate-50 dark:bg-[#1A1A1A] text-slate-900 dark:text-white">{inviteCode}</div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyInviteCode}
                  aria-label="Copy invite code"
                  className="h-9 px-3 text-slate-600 hover:text-slate-900 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:text-white dark:hover:bg-[#3A3A3A]"
                >
                  <Copy className="h-4 w-4" />
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
          <div className="p-4 px-6 border-t border-slate-200 dark:border-[#4A4A4A] flex flex-wrap justify-between items-center gap-4 bg-white dark:bg-transparent rounded-b-lg">
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => window.location.href = '/patients'} className="font-medium shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A] dark:hover:text-white dark:hover:border-[#6A6A6A] transition-colors">
                <UserPlus className="mr-2 h-4 w-4" />
                Add patient
              </Button>
              <Button variant="outline" onClick={() => window.location.href = '/doctors'} className="font-medium shadow-sm text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 dark:border-[#4A4A4A] dark:bg-transparent dark:text-[#E0E0E0] dark:hover:bg-[#3A3A3A] dark:hover:text-white dark:hover:border-[#6A6A6A] transition-colors">
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
                            <Trash2 className="h-4 w-4 text-destructive" />
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
                {clinicRole === 'admin' ? (
                  <Select
                    value={m.jobRole || 'Other'}
                    onValueChange={async (val: any) => {
                      if (!clinicId) return;
                      try {
                        await updateMemberJobRole({
                          clinicId,
                          userId: m.uid,
                          memberEmail: m.email,
                          memberName: m.displayName,
                          newJobRole: val,
                        });
                        toast({ title: 'Role updated successfully' });
                      } catch (e: any) {
                        toast({ title: e.message || 'Failed to update role', variant: 'destructive' });
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Doctor">Doctor</SelectItem>
                      <SelectItem value="Receptionist">Receptionist</SelectItem>
                      <SelectItem value="Dental Assistant">Dental Assistant</SelectItem>
                      <SelectItem value="Hygienist">Hygienist</SelectItem>
                      <SelectItem value="Office Manager">Office Manager</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-xs text-muted-foreground mr-2">{m.jobRole || 'Other'}</span>
                )}
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
