
'use client';

import React, { ReactNode } from 'react';
import { initializeFirebase } from '.';
import { FirebaseProvider, type FirebaseContextValue } from './provider';
import { UserProvider } from './auth/use-user';

// Initialize Firebase on the client
const firebaseInstance = initializeFirebase();

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The value prop is memoized internally by React, so this is safe.
  return (
    <FirebaseProvider value={firebaseInstance as FirebaseContextValue}>
      <UserProvider>
        {children}
      </UserProvider>
    </FirebaseProvider>
  );
}
