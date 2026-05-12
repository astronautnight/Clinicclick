

'use client';

import type { Prescription, Patient, UserProfile, Doctor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears } from 'date-fns';
import * as React from 'react';


interface PrescriptionPreviewProps {
  prescription: Prescription;
  patient: Patient | null;
  clinic: UserProfile | null;
  doctor: Doctor | null;
}

function getAge(dateString: string) {
  if (!dateString) return 'N/A';
  return differenceInYears(new Date(), new Date(dateString));
}

export const PrescriptionPreview = React.forwardRef<HTMLDivElement, PrescriptionPreviewProps>(
  ({ prescription, patient, clinic, doctor }, ref) => {

  return (
      <div ref={ref}>
        <div className="prescription-print-area">
            <Card className="font-sans w-full max-w-xl mx-auto shadow-none border-0">
            {/* HEADER */}
            <CardHeader className="text-center p-6 border-b">
                <CardTitle className="text-3xl font-bold text-primary">
                {clinic?.clinicName || 'Dental Clinic'}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                {doctor?.name}
                {doctor?.specialization ? ` • ${doctor.specialization}` : ''}
                {doctor?.registrationNumber && ` • Reg. No: ${doctor.registrationNumber}`}
                </CardDescription>
            </CardHeader>

            {/* BODY */}
            <CardContent className="p-8 text-sm">
                {/* Patient + Date */}
                <div className="flex justify-between mb-4 text-base">
                <div>
                    <p><strong>Patient:</strong> {patient?.firstName} {patient?.lastName}</p>
                    <p><strong>Age / Gender:</strong> {getAge(patient?.dateOfBirth || '')} / {patient?.gender}</p>
                </div>
                <div>
                    <p><strong>Date:</strong> {format(new Date(prescription.date), 'dd/MM/yyyy')}</p>
                </div>
                </div>

                <Separator />

                {/* RX SECTION */}
                <div className="mt-6">
                <p className="text-2xl font-serif font-bold text-primary">℞</p>

                <ul className="mt-4 space-y-6">
                    {prescription.items.map((item, index) => (
                    <li key={index}>
                        <p className="font-semibold text-lg">{index + 1}. {item.drugName}</p>

                        <div className="pl-4 mt-1 text-gray-600 text-sm">
                        <p><strong>Dosage:</strong> {item.dosage}</p>
                        <p><strong>Frequency:</strong> {item.frequency}</p>
                        <p><strong>Duration:</strong> {item.duration}</p>
                        {item.notes && (
                            <p><strong>Instruction:</strong> {item.notes}</p>
                        )}
                        </div>
                    </li>
                    ))}
                </ul>
                </div>

                {/* ADVICE */}
                {prescription.notes && (
                <div className="mt-8">
                    <p className="font-semibold text-base mb-1">Advice:</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{prescription.notes}</p>
                </div>
                )}
            </CardContent>

            {/* FOOTER */}
            <CardFooter className="p-8 pt-2">
                <div className="w-full text-right mt-12 border-t border-dashed pt-4">
                <p className="font-semibold text-base">Signature</p>
                <div className="h-10"></div>
                <p className="text-sm text-gray-500">{doctor?.name}</p>
                </div>
            </CardFooter>
            </Card>
        </div>
      </div>
  );
});

PrescriptionPreview.displayName = 'PrescriptionPreview';
