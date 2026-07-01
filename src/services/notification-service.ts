import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

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

  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('Foreground message received in active app window:', payload);
    callback(payload);
  });
}
