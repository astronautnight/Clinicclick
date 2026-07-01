import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { isNativePlatform, getPushNotifications } from '@/lib/capacitor-plugins';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/**
 * Retrieve the Firebase Messaging instance safely in client-side environment.
 */
export async function getMessagingInstance() {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  const { firebaseApp } = initializeFirebase();
  return getMessaging(firebaseApp);
}

/**
 * Request notification permission, register service worker, fetch FCM token, and save it to Firestore.
 */
export async function requestNotificationPermission(db: any, userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (isNativePlatform()) {
    try {
      const PushNotifications = getPushNotifications();
      if (!PushNotifications) {
        console.warn('PushNotifications plugin not available');
        return null;
      }
      
      const permStatus = await PushNotifications.requestPermissions();
      if (permStatus.receive === 'granted') {
        await PushNotifications.register();
        
        return new Promise<string | null>((resolve) => {
          const timeout = setTimeout(() => resolve(null), 5000);
          
          PushNotifications.addListener('registration', async (token: any) => {
            clearTimeout(timeout);
            console.log('Native FCM Token successfully retrieved:', token.value);
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
              fcmToken: token.value,
              fcmTokens: arrayUnion(token.value),
            });
            resolve(token.value);
          });
          
          PushNotifications.addListener('registrationError', (error: any) => {
            clearTimeout(timeout);
            console.error('Error on native push registration:', error);
            resolve(null);
          });
        });
      } else {
        console.warn('Native notification permission not granted:', permStatus);
        return null;
      }
    } catch (e) {
      console.error('Failed to request native push permissions:', e);
      return null;
    }
  }

  // Fallback to Web Push logic
  if (!('Notification' in window)) {
    throw new Error('Push notifications are not supported on this device/browser.');
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission was not granted:', permission);
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('Firebase Messaging is not supported in this browser.');
      return null;
    }

    // Register/get active service worker
    const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      console.log('FCM Token successfully retrieved:', token);
      
      // Save FCM token to Firestore user profile document
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token, // Store primary token
        fcmTokens: arrayUnion(token), // Support multiple devices / logins
      });
      return token;
    } else {
      console.warn('No FCM token returned from getToken API.');
      return null;
    }
  } catch (error) {
    console.error('Failed to register push notifications:', error);
    return null;
  }
}

/**
 * Register a listener for notifications received while the app is in the foreground.
 */
export async function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === 'undefined') return () => {};

  if (isNativePlatform()) {
    const PushNotifications = getPushNotifications();
    if (!PushNotifications) return () => {};
    
    let listener: any = null;
    PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
      console.log('Native foreground message received:', notification);
      callback({
        notification: {
          title: notification.title,
          body: notification.body,
        }
      });
    }).then((l: any) => listener = l);
    
    return () => {
      if (listener && typeof listener.remove === 'function') {
        listener.remove();
      }
    };
  }

  // Web logic

  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received in active app window:', payload);
    callback(payload);
  });
}
