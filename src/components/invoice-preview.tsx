
'use client';

import type { Patient, UserProfile, Doctor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, differenceInYears } from 'date-fns';
import * as React from 'react';

interface PatientFinancials extends Patient {
    totalBillable: number;
    totalPaid: number;
    balanceDue: number;
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

interface InvoicePreviewProps {
  invoice: GeneratedInvoice;
}

function getAge(dateString: string) {
  if (!dateString) return 'N/A';
  return differenceInYears(new Date(), new Date(dateString));
}

export const InvoicePreview = React.forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice }, ref) => {

  const { patient, clinic, doctor, invoiceDate, totalAmount, gstAmount, finalAmount, gstRate, balanceDue, totalPaid } = invoice;

  return (
      <div ref={ref}>
        <div className="invoice-print-area">
            <Card className="font-sans w-full max-w-2xl mx-auto shadow-none border-0">
            {/* HEADER */}
            <CardHeader className="text-center p-6 border-b">
                <p className="text-sm text-muted-foreground">Clinic@Click</p>
                <CardTitle className="text-3xl font-bold text-primary">
                {clinic?.clinicName || 'Dental Clinic'}
                </CardTitle>
                <CardDescription className="text-base mt-1">
                 {doctor?.name}
                 {doctor?.specialization && ` • ${doctor.specialization}`}
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
                    <p><strong>Date:</strong> {format(new Date(invoiceDate), 'dd/MM/yyyy')}</p>
                </div>
                </div>

                <Separator />

                {/* Procedures Table */}
                <div className="mt-6">
                 <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Procedure</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Unit Cost (₹)</TableHead>
                          <TableHead className="text-right">Total (₹)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {patient.linkedProcedures?.map((proc, index) => (
                          <TableRow key={index}>
                            <TableCell>{proc.procedureName}</TableCell>
                            <TableCell className="text-center">{proc.quantity || 1}</TableCell>
                            <TableCell className="text-right">₹{proc.cost.toLocaleString()}</TableCell>
                            <TableCell className="text-right">₹{(proc.cost * (proc.quantity || 1)).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                </div>

                {/* Financial Summary */}
                <div className="flex justify-end mt-6">
                      <div className="w-full max-w-sm space-y-2">
                         <div className="flex justify-between">
                           <span>Subtotal:</span>
                           <span>₹{totalAmount.toLocaleString()}</span>
                         </div>
                         {gstRate > 0 && (
                            <div className="flex justify-between">
                               <span>GST ({gstRate}%):</span>
                               <span>₹{gstAmount.toLocaleString()}</span>
                            </div>
                         )}
                         <Separator />
                         <div className="flex justify-between font-bold text-lg">
                           <span>Total Amount:</span>
                           <span>₹{finalAmount.toLocaleString()}</span>
                         </div>
                          <div className="flex justify-between text-muted-foreground">
                           <span>Amount Paid:</span>
                           <span>- ₹{totalPaid.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between font-bold text-primary text-xl">
                           <span>Balance Due:</span>
                           <span>₹{balanceDue.toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
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

InvoicePreview.displayName = 'InvoicePreview';
