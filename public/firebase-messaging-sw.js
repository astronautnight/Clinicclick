// Import the Firebase scripts inside the service worker
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// Initialize Firebase App in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyD8miPEbYU8-aNe4BEXCfAg4N5bIjaYp0U",
  authDomain: "clinicclick-xreue.firebaseapp.com",
  projectId: "clinicclick-xreue",
  storageBucket: "clinicclick-xreue.appspot.com",
  messagingSenderId: "773560277187",
  appId: "1:773560277187:web:4c6ca9393c9473fe942a76",
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification ? payload.notification.title : 'New Message';
  const notificationOptions = {
    body: payload.notification ? payload.notification.body : 'You have a new update.',
    icon: '/favicon.ico',
    tag: payload.collapseKey || 'default-tag',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
