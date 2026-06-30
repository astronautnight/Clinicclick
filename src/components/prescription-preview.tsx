

'use client';

import type { Prescription, Patient, Doctor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, differenceInYears } from 'date-fns';
import * as React from 'react';
import { Hospital, MapPin, Phone } from 'lucide-react';


interface PrescriptionPreviewProps {
    prescription: Prescription;
    patient: Patient | null;
    clinic: any | null;
    doctor: Doctor | null;
}

function getAge(dateString: string) {
    if (!dateString) return 'N/A';
    return differenceInYears(new Date(), new Date(dateString));
}

function formatDoctorName(name: string | undefined | null) {
    if (!name) return '';
    if (name.startsWith('Dr. ')) return name;
    return `Dr. ${name}`;
}

export const PrescriptionPreview = React.forwardRef<HTMLDivElement, PrescriptionPreviewProps>(
    ({ prescription, patient, clinic, doctor }, ref) => {

        return (
            <div ref={ref} className="bg-white text-slate-950 p-1">
                <div className="prescription-print-area bg-white text-slate-950">
                    <Card className="font-sans w-full max-w-xl mx-auto shadow-none border border-slate-200 bg-white dark:bg-white text-slate-950 dark:text-slate-950">
                        {/* HEADER */}
                        <CardHeader className="p-6 border-b border-slate-200 dark:border-slate-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                {/* Left: Clinic Logo & Details */}
                                <div className="flex gap-4 items-center">
                                    {clinic?.logoUrl ? (
                                        <img
                                            src={clinic.logoUrl}
                                            alt={`${clinic?.clinicName || 'Clinic'} Logo`}
                                            className="h-16 w-16 rounded-xl object-cover border border-slate-100 dark:border-slate-100 shadow-sm"
                                        />
                                    ) : (
                                        <div className="h-16 w-16 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0 border border-blue-100 dark:bg-blue-50 dark:text-blue-500 dark:border-blue-100">
                                            <Hospital className="h-8 w-8" />
                                        </div>
                                    )}
                                    <div>
                                        <CardTitle className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-900">
                                            {clinic?.clinicName || clinic?.name || 'Dental Clinic'}
                                        </CardTitle>
                                        <div className="text-xs text-slate-500 dark:text-slate-500 mt-1 space-y-0.5">
                                            {clinic?.address && (
                                                <p className="flex items-center gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400 inline shrink-0" /> {clinic.address}
                                                </p>
                                            )}
                                            {(clinic?.phone || clinic?.phoneNumber) && (
                                                <p className="flex items-center gap-1">
                                                    <Phone className="h-3.5 w-3.5 text-slate-400 dark:text-slate-400 inline shrink-0" /> {clinic.phone || clinic.phoneNumber}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Doctor Info */}
                                <div className="text-left sm:text-right space-y-1">
                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-800">
                                        {formatDoctorName(doctor?.name || 'Practitioner')}
                                    </p>
                                    {doctor?.specialization && (
                                        <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-600 uppercase tracking-wider">
                                            {doctor.specialization}
                                        </p>
                                    )}
                                    {doctor?.registrationNumber && (
                                        <p className="text-xs text-slate-400 dark:text-slate-400">
                                            Reg. No: {doctor.registrationNumber}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {/* BODY */}
                        <CardContent className="p-8 text-sm text-slate-900 dark:text-slate-900">
                            {/* Patient + Date */}
                            <div className="flex justify-between mb-4 text-base text-slate-800 dark:text-slate-800">
                                <div>
                                    <p><strong>Patient:</strong> {patient?.firstName} {patient?.lastName}</p>
                                    <p><strong>Age / Gender:</strong> {getAge(patient?.dateOfBirth || '')} / {patient?.gender}</p>
                                </div>
                                <div>
                                    <p><strong>Date:</strong> {format(new Date(prescription.date), 'dd/MM/yyyy')}</p>
                                </div>
                            </div>

                            <Separator className="bg-slate-200 dark:bg-slate-200" />

                            {/* RX SECTION */}
                            <div className="mt-6">
                                <p className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-900">℞</p>

                                <ul className="mt-4 space-y-6">
                                    {prescription.items.map((item, index) => (
                                        <li key={index}>
                                            <p className="font-semibold text-lg text-slate-900 dark:text-slate-900">{index + 1}. {item.drugName}</p>

                                            <div className="pl-4 mt-1 text-slate-600 dark:text-slate-600 text-sm">
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
                                    <p className="font-semibold text-base mb-1 text-slate-900 dark:text-slate-900">Advice:</p>
                                    <p className="text-slate-600 dark:text-slate-600 whitespace-pre-wrap">{prescription.notes}</p>
                                </div>
                            )}
                        </CardContent>

                        {/* FOOTER */}
                        <CardFooter className="p-8 pt-2 flex flex-col items-stretch gap-6 bg-white dark:bg-white text-slate-950 dark:text-slate-955">
                            <div className="w-full text-right mt-12 border-t border-dashed border-slate-200 dark:border-slate-200 pt-4">
                                <p className="font-semibold text-base text-slate-800 dark:text-slate-800">Signature</p>
                                <div className="h-10"></div>
                                <p className="text-sm text-slate-500 dark:text-slate-500">{formatDoctorName(doctor?.name)}</p>
                            </div>
                            <div className="w-full text-center text-xs text-slate-400 dark:text-slate-400 border-t border-slate-200 dark:border-slate-200 pt-4">
                                {clinic?.clinicName || clinic?.name || 'Dental Clinic'}
                                {clinic?.address ? ` · ${clinic.address}` : ''}
                                {(clinic?.phone || clinic?.phoneNumber) ? ` · ${clinic.phone || clinic.phoneNumber}` : ''}
                                {` · Generated via Clinic@Click`}
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        );
    });

PrescriptionPreview.displayName = 'PrescriptionPreview';
