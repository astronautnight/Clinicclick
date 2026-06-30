'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { onForegroundMessage, requestNotificationPermission } from '@/services/notification-service';
import { useToast } from '@/hooks/use-toast';

export function NotificationListener() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // Listen for foreground notifications
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    async function setupForegroundListener() {
      try {
        const unsub = await onForegroundMessage((payload) => {
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
  }, [toast]);

  // Auto-refresh token if user logged in and permission is already granted
  useEffect(() => {
    if (user && db && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        requestNotificationPermission(db, user.uid);
      }
    }
  }, [user, db]);

  return null;
}
