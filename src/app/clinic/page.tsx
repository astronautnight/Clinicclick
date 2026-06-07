
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

import { MoreVertical, Edit, Hospital, Copy, Trash2, UserPlus, User } from 'lucide-react';
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
  const [editingClinicName, setEditingClinicName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSavingName, setIsSavingName] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  
  const [newClinicName, setNewClinicName] = useState('');

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
    if (!clinicId || !db || isLeaving) return;

    const clinicDocRef = doc(db, 'clinics', clinicId);

    const unsubClinic = onSnapshot(clinicDocRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            setClinicName(data.name);
            setInviteCode(data.inviteCode);
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
  }, [clinicId, db, isLeaving]);

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
  
    try {
      await createClinic({
        ownerUid: user.uid,
        clinicName: newClinicName.trim(),
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
        await updateClinic(clinicId, { name: editingClinicName.trim() });
        toast({ title: 'Clinic name updated successfully' });
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
      window.location.reload();
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
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <Hospital className="mr-3 h-8 w-8 text-indigo-500" />
            My Clinic
        </h1>
        <div className="max-w-md space-y-6">
            <Card>
            <CardHeader>
                <CardTitle>Create Clinic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Input
                placeholder="Clinic name"
                value={newClinicName}
                onChange={e => setNewClinicName(e.target.value)}
                disabled={!!clinicId}
                />
                <Button
                onClick={handleCreateClinic}
                disabled={!!clinicId}
                >
                Create Clinic
                </Button>
            </CardContent>
            </Card>

            <Card>
            <CardHeader>
                <CardTitle>Join Clinic</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Input
                placeholder="Invite code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                />
                <Button onClick={handleJoinClinic} disabled={joining}>
                {joining ? 'Requesting…' : 'Request to Join'}
                </Button>
            </CardContent>
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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Clinic Details</CardTitle>
            <div className="flex items-center gap-2">
              {clinicRole === 'admin' && !isEditingName && (
                <Button variant="ghost" size="icon" onClick={() => {
                  setEditingClinicName(clinicName);
                  setIsEditingName(true);
                }}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    {isLastMember ? 'Delete Clinic' : 'Leave Clinic'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
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
          <CardDescription>Manage your clinic's details and invite code.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div>
                <Label className="text-sm font-medium text-muted-foreground">Clinic Name</Label>
                {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                        <Input value={editingClinicName} onChange={(e) => setEditingClinicName(e.target.value)} disabled={isSavingName} />
                        <Button onClick={handleSaveClinicName} disabled={isSavingName}>{isSavingName ? 'Saving...' : 'Save'}</Button>
                        <Button variant="outline" onClick={() => setIsEditingName(false)} disabled={isSavingName}>Cancel</Button>
                    </div>
                ) : (
                    <p className="text-lg font-semibold">{clinicName}</p>
                )}
            </div>

            <div>
              <Label className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500">Share this 8-digit code with other doctors that you want to invite</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-base px-3 py-1 font-mono text-indigo-700 bg-indigo-50 border-indigo-200">{inviteCode}</Badge>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyInviteCode}
                    aria-label="Copy invite code"
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
                    >
                        Regenerate
                    </Button>
                )}
              </div>
            </div>
            
            <div className="pt-4 flex gap-4 border-t">
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/patients">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add First Patient
                    </Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Link href="/doctors">
                        <User className="mr-2 h-4 w-4" />
                        Add Doctor Details
                    </Link>
                </Button>
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

      {/* JOIN REQUESTS */}
      {clinicRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Join Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.length === 0 && <p className="text-muted-foreground">No pending requests</p>}
            {requests.map(r => (
              <div key={r.uid} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                <span className="font-medium">{r.displayName}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptRequest(r.uid)}>
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => rejectRequest(r.uid)}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
