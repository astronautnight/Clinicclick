'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ClinicSetupAlertProps {
  sectionName: string;
}

export function ClinicSetupAlert({ sectionName }: ClinicSetupAlertProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-amber-200/50 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 rounded-lg text-sm text-amber-800 dark:text-amber-300">
      <span>Please set up your clinic first to manage {sectionName.toLowerCase()}.</span>
      <Link href="/clinic" passHref>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-colors">
          Setup Clinic
        </Button>
      </Link>
    </div>
  );
}
