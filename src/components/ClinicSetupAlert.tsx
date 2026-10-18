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
      <div className="flex items-center gap-2">
        <Link href="/clinic?mode=create" passHref>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-sm transition-colors">
            Add Clinic
          </Button>
        </Link>
        <Link href="/clinic?mode=join" passHref>
          <Button size="sm" variant="outline" className="border-amber-600 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-medium shadow-sm transition-colors">
            Join Clinic
          </Button>
        </Link>
      </div>
    </div>
  );
}
