'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database, Download } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function BackupPage() {
  const { clinicId } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    if (!clinicId || !db) {
      toast({
        title: 'Error',
        description: 'No clinic selected.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const collections = ['patients', 'doctors', 'procedures', 'appointments'];
      const backupData: Record<string, unknown[]> = {};

      for (const col of collections) {
        const snap = await getDocs(collection(db, 'clinics', clinicId, col));
        backupData[col] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clinic_backup_${clinicId}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Complete',
        description: 'Clinic data exported successfully.',
      });
    } catch (error: unknown) {
      console.error('Backup failed:', error);
      toast({
        title: 'Error',
        description: 'Backup failed.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Clinic Data Backup</CardTitle>
              <CardDescription>
                Export all patients, doctors, appointments, and procedures in JSON format.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Regularly creating offline backups helps ensure your dental clinic records remain safe and portable.
          </p>
          <Button onClick={handleBackup} disabled={loading} className="gap-2">
            <Download className="h-4 w-4" />
            {loading ? 'Exporting...' : 'Export Clinic Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

