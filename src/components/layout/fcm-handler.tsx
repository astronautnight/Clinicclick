'use client';

import { useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

/**
 * FcmHandler — registers for push notifications on the native Android app.
 *
 * Because this web app is loaded inside a Capacitor WebView (via server.url),
 * the Capacitor bridge is injected at runtime. We access it through `window.Capacitor`
 * rather than npm imports.
 */
export function FcmHandler() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    // 1. FCM initialization started
    console.log('FCM: FCM initialization started');

    const cap = (window as any).Capacitor;
    const isNative = cap?.isNativePlatform?.() ?? false;

    // 2. Is native platform result
    console.log('FCM: Is native platform result:', isNative);

    if (!isNative) {
      return;
    }

    const PushNotifications = cap.Plugins?.PushNotifications;
    if (!PushNotifications) {
      console.error('FCM: PushNotifications plugin not available on bridge.');
      return;
    }

    const addListeners = async () => {
      // 7. Registration success token & save to Firestore (only if changed)
      await PushNotifications.addListener('registration', async (token: any) => {
        console.log('FCM: Registration success token:', token.value);
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentToken = userSnap.data().fcmToken;
              if (currentToken !== token.value) {
                await updateDoc(userRef, {
                  fcmToken: token.value,
                  fcmTokenUpdatedAt: new Date().toISOString(),
                });
                console.log('FCM: FCM Token successfully saved/updated in Firestore.');
              } else {
                console.log('FCM: FCM Token is already up to date.');
              }
            } else {
              console.warn('FCM: User document does not exist in Firestore.');
            }
          } catch (error) {
            console.error('FCM: Error saving FCM token to Firestore:', error);
          }
        }
      });

      // 8. Registration error
      await PushNotifications.addListener('registrationError', (err: any) => {
        console.error('FCM: Registration error:', err.error);
      });

      // Handle foreground notifications
      await PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
        console.log('FCM: Push notification received in foreground:', notification);
        toast({
          title: notification.title || 'New Notification',
          description: notification.body || '',
        });
      });

      // Handle notification taps when the app is closed / in background
      await PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
        console.log('FCM: Push notification action performed:', action);
        toast({
          title: action.notification.title || 'Notification Tapped',
          description: action.notification.body || '',
        });
      });
    };

    addListeners();

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [user, db, toast]);

  // Register for push notifications & request permissions
  useEffect(() => {
    const cap = (window as any).Capacitor;
    const isNative = cap?.isNativePlatform?.() ?? false;

    if (!isNative) {
      return;
    }

    if (user) {
      // 3. User detected
      console.log('FCM: User detected:', user.uid);
    } else {
      return;
    }

    const PushNotifications = cap.Plugins?.PushNotifications;
    const LocalNotifications = cap.Plugins?.LocalNotifications;

    if (!PushNotifications) {
      console.error('FCM: PushNotifications plugin not available.');
      return;
    }

    const requestPermissionAndRegister = async () => {
      try {
        // Create default notification channel for Android (required for Android 8.0+)
        if (LocalNotifications) {
          await LocalNotifications.createChannel({
            id: 'default-channel',
            name: 'Default Alerts',
            description: 'Default notification channel for app alerts',
            importance: 5, // High importance (shows heads-up/banners)
            visibility: 1, // Public visibility
            sound: 'default'
          });
          console.log('FCM: Created/verified default notification channel');
        }

        // 4. Permission request started
        console.log('FCM: Permission request started');
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        // 5. Permission result
        console.log('FCM: Permission result:', permStatus.receive);

        // Also request local notification permission
        if (LocalNotifications) {
          let localPerm = await LocalNotifications.checkPermissions();
          if (localPerm.display === 'prompt') {
            localPerm = await LocalNotifications.requestPermissions();
          }
          console.log('FCM: Local notification permission result:', localPerm.display);
        }

        if (permStatus.receive === 'granted') {
          // 6. Registration started
          console.log('FCM: Registration started');
          await PushNotifications.register();
        } else {
          console.warn('FCM: Push notification permissions denied.');
        }
      } catch (error) {
        console.error('FCM: Error during push notification permission check/registration:', error);
      }
    };

    requestPermissionAndRegister();
  }, [user]);

  return null;
}
