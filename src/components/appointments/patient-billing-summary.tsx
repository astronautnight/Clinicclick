'use client';

import React, { useState, useEffect } from 'react';
import type { Patient, Procedure, AppointmentProcedureDetail, Transaction } from '@/types';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { initializeFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface PatientBillingSummaryProps {
  patientId?: string;
  patients?: Patient[];
  currentProcedureDetails?: AppointmentProcedureDetail[];
  currentProcedureIds?: string[];
  allProcedures?: Procedure[];
  transactions?: Transaction[];
  clinicId?: string | null;
  className?: string;
}

export function PatientBillingSummary({
  patientId,
  patients = [],
  currentProcedureDetails = [],
  currentProcedureIds = [],
  allProcedures = [],
  transactions = [],
  clinicId,
  className,
}: PatientBillingSummaryProps) {
  const { toast } = useToast();
  const [isFocused, setIsFocused] = useState(false);

  const patient = patients.find(p => p.id === patientId);

  // 1. Calculate Base Billable from existing patient linkedProcedures + newly linked procedures in this appointment
  const existingLinked = patient?.linkedProcedures || [];
  let baseBillable = existingLinked.reduce((acc, proc) => acc + ((proc.cost || 0) * (proc.quantity || 1)), 0);

  // Add any procedures in current appointment that aren't already in patient's linkedProcedures
  if (currentProcedureDetails && currentProcedureDetails.length > 0) {
    currentProcedureDetails.forEach(cd => {
      const alreadyLinked = existingLinked.some(lp => lp.procedureId === cd.procedureId);
      if (!alreadyLinked) {
        const pObj = allProcedures.find(p => p.id === cd.procedureId);
        if (pObj && pObj.cost) {
          baseBillable += pObj.cost;
        }
      }
    });
  } else if (currentProcedureIds && currentProcedureIds.length > 0) {
    currentProcedureIds.forEach(id => {
      const alreadyLinked = existingLinked.some(lp => lp.procedureId === id);
      if (!alreadyLinked) {
        const pObj = allProcedures.find(p => p.id === id);
        if (pObj && pObj.cost) {
          baseBillable += pObj.cost;
        }
      }
    });
  }

  // 2. Apply patient discount if any
  let discountAmount = 0;
  if (patient) {
    if (patient.discountType === 'percentage' && patient.discountValue) {
      discountAmount = (baseBillable * patient.discountValue) / 100;
    } else if (patient.discountType === 'fixed' && patient.discountValue) {
      discountAmount = patient.discountValue;
    }
  }

  const totalBillable = Math.max(0, baseBillable - discountAmount);

  // 3. Calculate Actual Paid from transactions
  const actualPaid = patient
    ? transactions
        .filter(t => t.patientId === patient.id && t.type === 'Earning')
        .reduce((acc, t) => acc + (t.amount || 0), 0)
    : 0;

  // Local state for the editable paid input field
  const [paidInput, setPaidInput] = useState<string>(String(actualPaid));

  useEffect(() => {
    if (!isFocused) {
      setPaidInput(String(actualPaid));
    }
  }, [actualPaid, isFocused, patientId]);

  // Dynamic Due calculation based on current input
  const currentPaidNum = parseFloat(paidInput) || 0;
  const balanceDue = Math.max(0, totalBillable - currentPaidNum);

  // Save payment adjustment on blur or enter
  const handleSavePaid = async () => {
    setIsFocused(false);
    if (!clinicId || !patient) return;

    const newPaid = parseFloat(paidInput);
    if (isNaN(newPaid) || newPaid < 0) {
      setPaidInput(String(actualPaid));
      return;
    }

    const adjustmentAmount = newPaid - actualPaid;
    if (adjustmentAmount === 0) return;

    try {
      const { firestore: db } = initializeFirebase();
      const transactionsColRef = collection(db, 'clinics', clinicId, 'transactions');
      const payload: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        date: new Date().toISOString().split('T')[0],
        paymentDate: new Date().toISOString().split('T')[0],
        type: 'Earning',
        category: 'Procedure Fee',
        description: `Payment recorded via appointment card for ${patient.firstName} ${patient.lastName}.`,
        amount: adjustmentAmount,
        patientId: patient.id,
        paymentMethod: 'Cash',
      };

      await addDoc(transactionsColRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Payment Recorded',
        description: `Total paid amount updated to ₹${newPaid.toLocaleString()}.`,
      });
    } catch (error) {
      console.error('Failed to update payment:', error);
      toast({
        title: 'Error',
        description: 'Could not record payment adjustment.',
        variant: 'destructive',
      });
      setPaidInput(String(actualPaid));
    }
  };

  return (
    <div className={cn("pt-3 mt-3 border-t border-border/60", className)}>
      <div className="grid grid-cols-3 gap-2 items-center text-center">
        {/* Billable Column */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground mb-0.5">
            Billable
          </span>
          <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight">
            ₹{totalBillable.toLocaleString()}
          </span>
          {discountAmount > 0 && (
            <span className="text-[10px] text-muted-foreground line-through">
              ₹{baseBillable.toLocaleString()}
            </span>
          )}
        </div>

        {/* Paid Column (Editable Input with Green Currency Symbol) */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground mb-0.5">
            Paid
          </span>
          <div className="flex items-center justify-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              ₹
            </span>
            <Input
              type="number"
              min="0"
              value={paidInput}
              onChange={(e) => setPaidInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={handleSavePaid}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={!patient}
              className="w-16 sm:w-20 h-7 text-center text-xs font-semibold border-border/80 bg-background text-emerald-700 dark:text-emerald-300 rounded-md focus-visible:ring-1"
              placeholder="0"
            />
          </div>
        </div>

        {/* Due Column (Highlighted in Red) */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground mb-0.5">
            Due
          </span>
          <span className={cn(
            "text-xs sm:text-sm font-bold tracking-tight",
            balanceDue > 0 ? "text-red-600 dark:text-red-500" : "text-emerald-600 dark:text-emerald-400"
          )}>
            ₹{balanceDue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
