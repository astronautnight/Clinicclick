
"use client";

import { useUser, useFirestore } from "@/firebase";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { signOutUser } from "@/services/auth-service";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { requestNotificationPermission } from "@/services/notification-service";

export default function SettingsPage() {
  const { user, clinicId, clinicLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [importing, setImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string>("default");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Sync notificationsEnabled in real-time
  useEffect(() => {
    if (!db || !user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setNotificationsEnabled(snap.data().notificationsEnabled !== false);
      }
    });
    return () => unsub();
  }, [db, user]);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!user || !db) {
      toast({
        title: "Error",
        description: "You must be logged in to enable notifications.",
        variant: "destructive",
      });
      return;
    }

    setEnablingNotifications(true);
    try {
      const token = await requestNotificationPermission(db, user.uid);
      if (token) {
        setNotificationStatus("granted");
        toast({
          title: "Notifications Enabled",
          description: "This device will now receive push notifications.",
        });
      } else {
        setNotificationStatus(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : "denied");
        toast({
          title: "Failed to Enable",
          description: "Notification permission was not granted.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setEnablingNotifications(false);
    }
  };

  // ============================
  //       EXPORT FUNCTION
  // ============================
  const handleExport = async () => {
    try {
      if (!user || !clinicId || clinicLoading || !db) {
        toast({
          title: "Error",
          description: "Clinic not loaded.",
          variant: "destructive",
        });
        return;
      }

      const collections = ["patients", "doctors", "procedures", "appointments"];
      const backupData: Record<string, any[]> = {};

      for (const col of collections) {
        const snap = await getDocs(
          collection(db, "clinics", clinicId, col)
        );

        backupData[col] = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
      }

      const blob = new Blob(
        [JSON.stringify(backupData, null, 2)],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `clinic_backup_${clinicId}_${new Date().toISOString()}.json`;
      a.click();

      URL.revokeObjectURL(url);

      toast({
        title: "Backup Complete",
        description: "Clinic data exported successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Backup failed.",
        variant: "destructive",
      });
    }
  };

  // ============================
  //       IMPORT FUNCTION
  // ============================
  const handleImport = async (file: File) => {
    try {
      if (!user || !clinicId || clinicLoading || !db) {
        toast({
          title: "Error",
          description: "Clinic not loaded.",
          variant: "destructive",
        });
        return;
      }

      setImporting(true);

      const text = await file.text();
      const json = JSON.parse(text);

      const collections = Object.keys(json);

      for (const col of collections) {
        const colRef = collection(db, "clinics", clinicId, col);

        // 🔥 Clear existing clinic data
        const existing = await getDocs(colRef);
        for (const d of existing.docs) {
          await deleteDoc(doc(db, "clinics", clinicId, col, d.id));
        }

        // 🔥 Restore imported data
        for (const item of json[col]) {
          const id = item.id;
          const newItem = { ...item };
          delete newItem.id;

          await setDoc(
            doc(db, "clinics", clinicId, col, id),
            newItem
          );
        }
      }

      toast({
        title: "Restore Complete",
        description: "Clinic data restored successfully.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Import failed. Invalid file.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // ============================
  //       DELETE ACCOUNT
  // ============================
  const handleDeleteAccount = async () => {
    if (!user || !db) {
        toast({ title: "Error", description: "You must be logged in to delete your account.", variant: "destructive" });
        return;
    }
    setIsDeleting(true);
    const userDocRef = doc(db, "users", user.uid);
    try {
        await deleteDoc(userDocRef);
        await signOutUser();
        toast({ title: "Account Deleted", description: "Your account and associated data have been successfully deleted." });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error deleting account:", error);
            toast({ title: "Error", description: "Failed to delete account. Please try again or contact support.", variant: "destructive" });
        }
    } finally {
        setIsDeleting(false);
    }
  };


  // ============================
  //       SETTINGS UI
  // ============================
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Manage your application preferences and clinic data.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* THEME */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Theme Mode</Label>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark themes.
              </p>
            </div>
            <ThemeToggle />
          </div>

          {/* PUSH NOTIFICATIONS */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground font-normal">
                {notificationStatus === "denied"
                  ? "Notifications are blocked by your browser settings. Please allow them to receive updates."
                  : !notificationsEnabled
                    ? "Notifications are muted. You won't receive push alerts."
                    : "Receive updates, reminders, and alerts on this account."}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {notificationStatus !== "granted" ? (
                <Button 
                  onClick={handleEnableNotifications} 
                  disabled={enablingNotifications}
                  size="sm"
                >
                  {enablingNotifications ? "Enabling..." : "Enable Notifications"}
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Label htmlFor="settings-mute-switch" className="text-sm text-muted-foreground font-medium select-none">Mute</Label>
                  <Switch 
                    id="settings-mute-switch"
                    checked={!notificationsEnabled}
                    onCheckedChange={async (checked) => {
                      if (!db || !user) return;
                      await updateDoc(doc(db, "users", user.uid), {
                        notificationsEnabled: !checked
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* DATA MANAGEMENT */}
          <div className="p-4 border rounded-lg">
            <h3 className="text-base font-medium mb-2">
              Data Management (Clinic)
            </h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleExport}>
                Export Clinic Data
              </Button>

              <Input
                type="file"
                accept="application/json"
                disabled={importing}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleImport(e.target.files[0]);
                  }
                }}
              />

              <Button variant="destructive" disabled>
                Clear Local Cache
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Importing will overwrite existing clinic data. Proceed carefully.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive">
        <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>These actions are irreversible. Please proceed with caution.</CardDescription>
        </CardHeader>
        <CardContent>
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete My Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account, your user profile, and remove you from any associated clinic. It will NOT delete clinic data if other members exist.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Yes, delete my account"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                If you are the only admin of a clinic, deleting your account may result in the loss of access to that clinic's data for everyone.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
