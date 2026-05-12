'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Patient } from '@/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Share2, User, ClipboardList, Stethoscope, FileText, HeartPulse, History } from "lucide-react";

// Define the structure for sharing options
interface SharingOptions {
  patientDetails: boolean;
  medicalHistory: boolean;
  dentalHistory: boolean;
  dentalChart: boolean;
  observations: boolean;
  treatmentPlan: boolean;
  linkedProcedures: boolean;
  prescriptions: boolean;
}

const initialSharingOptions: SharingOptions = {
  patientDetails: true,
  medicalHistory: true,
  dentalHistory: true,
  dentalChart: true,
  observations: true,
  treatmentPlan: true,
  linkedProcedures: false,
  prescriptions: false,
};


export default function CaseSharingPage() {
  const { user, clinicId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sharingOptions, setSharingOptions] = useState<SharingOptions>(initialSharingOptions);
  
  useEffect(() => {
    if (!user || !db || !clinicId) return;

    const patientsColRef = collection(db, "clinics", clinicId, "patients");
    const unsubPatients = onSnapshot(patientsColRef, (snapshot) => {
      const fetchedPatients = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Patient));
      setPatients(fetchedPatients);
    }, (err) => {
        console.error("Error fetching patients:", err);
        toast({ title: "Error", description: "Could not load patients list.", variant: "destructive"});
    });

    return () => unsubPatients();
  }, [user, db, clinicId, toast]);
  
  const handleOptionChange = (optionKey: keyof SharingOptions) => {
    setSharingOptions(prev => ({...prev, [optionKey]: !prev[optionKey]}));
  };
  
  const handleShare = () => {
    const selectedOptions = Object.entries(sharingOptions)
      .filter(([, value]) => value)
      .map(([key]) => key);
      
    console.log("Sharing case for patient:", selectedPatientId, "with options:", selectedOptions);
    
    toast({
        title: "Secure Link Generated (Mock)",
        description: "A secure, time-limited link has been copied to your clipboard.",
    });
    
    setIsDialogOpen(false);
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight flex items-center">
        <Share2 className="mr-3 h-8 w-8 text-special2" />
        Case Sharing
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>Share a Patient Case</CardTitle>
          <CardDescription>Securely share selected patient case details with colleagues for second opinions or collaborative treatment planning.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="patientSelect">1. Select Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger id="patientSelect">
                    <SelectValue placeholder="Choose a patient to share..." />
                </SelectTrigger>
                <SelectContent>
                    {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id}>
                            {patient.firstName} {patient.lastName}
                        </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
        </CardContent>
        <CardFooter>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button disabled={!selectedPatientId}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Select Sharing Details
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Share Case: {selectedPatient?.firstName} {selectedPatient?.lastName}</DialogTitle>
                        <DialogDescription>
                            Select which details you want to include in the secure share link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="font-semibold text-sm">Include in Share Link:</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="patientDetails" checked={sharingOptions.patientDetails} onCheckedChange={() => handleOptionChange('patientDetails')} />
                                <Label htmlFor="patientDetails" className="flex items-center gap-2"><User className="h-4 w-4"/> Patient Details</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="medicalHistory" checked={sharingOptions.medicalHistory} onCheckedChange={() => handleOptionChange('medicalHistory')} />
                                <Label htmlFor="medicalHistory" className="flex items-center gap-2"><HeartPulse className="h-4 w-4"/> Medical History</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="dentalHistory" checked={sharingOptions.dentalHistory} onCheckedChange={() => handleOptionChange('dentalHistory')} />
                                <Label htmlFor="dentalHistory" className="flex items-center gap-2"><History className="h-4 w-4"/> Dental History</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="dentalChart" checked={sharingOptions.dentalChart} onCheckedChange={() => handleOptionChange('dentalChart')} />
                                <Label htmlFor="dentalChart" className="flex items-center gap-2"><Stethoscope className="h-4 w-4"/> Dental Chart</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="observations" checked={sharingOptions.observations} onCheckedChange={() => handleOptionChange('observations')} />
                                <Label htmlFor="observations" className="flex items-center gap-2"><ClipboardList className="h-4 w-4"/> Observations</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="treatmentPlan" checked={sharingOptions.treatmentPlan} onCheckedChange={() => handleOptionChange('treatmentPlan')} />
                                <Label htmlFor="treatmentPlan" className="flex items-center gap-2"><ClipboardList className="h-4 w-4"/> Treatment Plan</Label>
                            </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="linkedProcedures" checked={sharingOptions.linkedProcedures} onCheckedChange={() => handleOptionChange('linkedProcedures')} />
                                <Label htmlFor="linkedProcedures" className="flex items-center gap-2"><FileText className="h-4 w-4"/> Procedures Done</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="prescriptions" checked={sharingOptions.prescriptions} onCheckedChange={() => handleOptionChange('prescriptions')} />
                                <Label htmlFor="prescriptions" className="flex items-center gap-2"><FileText className="h-4 w-4"/> Prescriptions</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button onClick={handleShare}>Generate Secure Link</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </CardFooter>
      </Card>

       <Card>
        <CardHeader>
          <CardTitle>Received Cases</CardTitle>
          <CardDescription>View cases shared with you by other practitioners.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">When other doctors share cases with you, they will appear here for your review and comments.</p>
          <div className="mt-4 p-4 border rounded-md text-center text-muted-foreground">
            No cases currently shared with you.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
