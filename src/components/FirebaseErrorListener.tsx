
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.error('Caught permission error:', error.message);
      
      // In a real app, you might send this to a logging service.
      // For development, we're making it highly visible.
      if (process.env.NODE_ENV === 'development') {
        // The custom error class already throws an error that Next.js will catch.
        // We can also add a toast for good measure.
         toast({
          variant: 'destructive',
          title: 'Firestore Permission Denied',
          description: 'Check the browser console and Next.js error overlay for details on the security rule violation.',
          duration: 10000,
        });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      // Clean up the listener when the component unmounts
      // This is important to prevent memory leaks, though this component is likely to be mounted for the app's lifetime.
      // In a real app, you would need to implement `errorEmitter.off`. For this simplified version, we assume it's not needed.
    };
  }, [toast]);

  // This component does not render anything to the DOM.
  return null;
}
