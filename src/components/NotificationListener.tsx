'use client';

import { useEffect, useState } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { onForegroundMessage, requestNotificationPermission } from '@/services/notification-service';
import { useToast } from '@/hooks/use-toast';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

export function NotificationListener() {
  const { user, clinicId, clinicRole } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [activeAppts, setActiveAppts] = useState<any[]>([]);

  // 1. Subscribe to the user's notification preferences
  useEffect(() => {
    if (!db || !user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setNotificationsEnabled(snap.data().notificationsEnabled !== false);
      }
    }, (error) => {
      console.warn("Could not load user notification preference:", error);
    });

    return () => unsubProfile();
  }, [db, user]);

  // 2. Listen for foreground push notifications (FCM)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    async function setupForegroundListener() {
      try {
        const unsub = await onForegroundMessage((payload) => {
          if (!notificationsEnabled) return;
          // Display toast alert inside active application when message arrives
          toast({
            title: payload.notification?.title || "New Notification",
            description: payload.notification?.body || "You have a new message.",
          });
        });
        if (unsub) {
          unsubscribe = unsub;
        }
      } catch (error) {
        console.error("Failed to initialize foreground push listener:", error);
      }
    }

    setupForegroundListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast, notificationsEnabled]);

  // 3. Auto-refresh FCM push token or request permission if user logged in and notifications enabled
  useEffect(() => {
    if (user && db && typeof window !== 'undefined' && 'Notification' in window) {
      if ((Notification.permission === 'granted' || Notification.permission === 'default') && notificationsEnabled) {
        requestNotificationPermission(db, user.uid);
      }
    }
  }, [user, db, notificationsEnabled]);

  // 4. Fetch/Subscribe to active clinic appointments
  useEffect(() => {
    if (!db || !user || !clinicId || !notificationsEnabled) {
      setActiveAppts([]);
      return;
    }

    const apptsRef = collection(db, 'clinics', clinicId, 'appointments');
    const unsubAppts = onSnapshot(apptsRef, (snap) => {
      const apptsList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setActiveAppts(apptsList);
    }, (error) => {
      console.warn("Could not subscribe to appointments for notification engine:", error);
    });

    return () => unsubAppts();
  }, [db, user, clinicId, notificationsEnabled]);

  // 5. Periodic Checker (Web UI) and Native Pre-scheduler
  useEffect(() => {
    if (!db || !user || !notificationsEnabled || activeAppts.length === 0) return;

    let isNative = false;
    try {
      const { isNativePlatform } = require('@/lib/capacitor-plugins');
      isNative = isNativePlatform();
    } catch (e) {}

    // A: Native Android Pre-scheduling (Runs once when activeAppts changes)
    if (isNative) {
      const scheduleNativeAppts = async () => {
        try {
          const { getLocalNotifications } = require('@/lib/capacitor-plugins');
          const LocalNotifications = getLocalNotifications();
          if (!LocalNotifications) return;

          const now = new Date();
          const scheduledNotifications: any[] = [];

          for (const appt of activeAppts) {
            if (!appt.date || !appt.startTime || appt.status === 'Cancelled' || appt.status === 'Completed') continue;

            try {
              const [year, month, day] = appt.date.split('-').map(Number);
              const [hours, minutes] = appt.startTime.split(':').map(Number);
              const apptTime = new Date(year, month - 1, day, hours, minutes);

              const reminderTime = new Date(apptTime.getTime() - 15 * 60 * 1000);

              // Only schedule if the reminder time is in the future
              if (reminderTime > now) {
                // Generate a numeric ID from the appointment ID
                let numericId = 0;
                for (let i = 0; i < appt.id.length; i++) {
                  numericId = (numericId << 5) - numericId + appt.id.charCodeAt(i);
                  numericId |= 0;
                }
                numericId = Math.abs(numericId);

                scheduledNotifications.push({
                  id: numericId,
                  title: "Upcoming Appointment",
                  body: `Appointment at ${appt.startTime} starting soon.`,
                  schedule: { at: reminderTime },
                  channelId: 'default-channel',
                });
              }
            } catch (e) {
              console.error("Error calculating appointment time:", e);
            }
          }

          if (scheduledNotifications.length > 0) {
            await LocalNotifications.schedule({ notifications: scheduledNotifications });
            console.log(`Pre-scheduled ${scheduledNotifications.length} appointment reminders.`);
          }
        } catch (error) {
          console.error("Error scheduling local notifications:", error);
        }
      };
      
      scheduleNativeAppts();
    }

    // B: Web UI Interval Checker (Only runs on web to avoid duplicate native notifications)
    if (!isNative) {
      const checkAppts = async () => {
        const now = new Date();
        const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);

        for (const appt of activeAppts) {
          if (!appt.date || !appt.startTime || appt.status === 'Cancelled' || appt.status === 'Completed') continue;

          try {
            const [year, month, day] = appt.date.split('-').map(Number);
            const [hours, minutes] = appt.startTime.split(':').map(Number);
            const apptTime = new Date(year, month - 1, day, hours, minutes);

            const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
            
            // Trigger notification if appointment starts between 10 minutes ago and 15 minutes from now
            if (apptTime >= tenMinsAgo && apptTime <= fifteenMinsFromNow) {
              const notifId = `appointment_reminder_${appt.id}`;
              const notifRef = doc(db, 'users', user.uid, 'notifications', notifId);
              
              const notifSnap = await getDoc(notifRef);
              if (!notifSnap.exists()) {
                await setDoc(notifRef, {
                  id: notifId,
                  title: "Upcoming Appointment",
                  body: `You have an appointment with ${appt.patientName || 'a patient'} at ${appt.startTime}.`,
                  createdAt: serverTimestamp(),
                  read: false,
                  type: 'appointment'
                });

                toast({
                  title: "Upcoming Appointment",
                  description: `Appointment at ${appt.startTime} starting soon.`,
                });

                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification("Upcoming Appointment", {
                    body: `Appointment at ${appt.startTime} starting soon.`,
                  });
                }
              }
            }
          } catch (e) {
            console.error("Error processing appointment time trigger:", e);
          }
        }
      };

      checkAppts();
      const intervalId = setInterval(checkAppts, 30000);
      return () => clearInterval(intervalId);
    }
  }, [db, user, notificationsEnabled, activeAppts, toast]);

  // 6. Subscribe to new user requests (Admins only)
  useEffect(() => {
    if (!db || !user || !clinicId || !notificationsEnabled || clinicRole !== 'admin') return;

    const requestsRef = collection(db, 'clinics', clinicId, 'pendingRequests');
    const unsubRequests = onSnapshot(requestsRef, (snap) => {
      snap.docs.forEach(async (d) => {
        const request = d.data();
        const notifId = `join_request_${d.id}`;
        const notifRef = doc(db, 'users', user.uid, 'notifications', notifId);
        
        const notifSnap = await getDoc(notifRef);
        if (!notifSnap.exists()) {
          await setDoc(notifRef, {
            id: notifId,
            title: "New Join Request",
            body: `${request.displayName || 'A new user'} has requested to join your clinic.`,
            createdAt: serverTimestamp(),
            read: false,
            type: 'join_request'
          });

          toast({
            title: "New Join Request",
            description: `${request.displayName || 'A user'} wants to join the clinic.`,
          });

          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("New Join Request", {
              body: `${request.displayName || 'A user'} wants to join the clinic.`,
            });
          }
        }
      });
    }, (error) => {
      console.warn("Could not subscribe to pending requests for notification engine:", error);
    });

    return () => unsubRequests();
  }, [db, user, clinicId, clinicRole, notificationsEnabled, toast]);

  return null;
}
