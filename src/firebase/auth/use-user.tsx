
'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../provider';
import { useFirestore } from '../provider';
import { useRouter, usePathname } from 'next/navigation';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */
export type ClinicRole = 'owner' | 'admin' | 'member';

interface UserContextValue {
  user: User | null;
  loading: boolean;

  clinicId: string | null;
  clinicRole: ClinicRole | null;
  clinicLoading: boolean;
}

/* ------------------------------------------------------------------ */
/* Context */
/* ------------------------------------------------------------------ */
const UserContext = createContext<UserContextValue>({
  user: null,
  loading: true,
  clinicId: null,
  clinicRole: null,
  clinicLoading: true,
});

export const useUser = () => {
  const ctx = useContext(UserContext);

  if (ctx.loading || ctx.clinicLoading) {
    return {
      ...ctx,
      clinicId: null,
    };
  }

  return ctx;
};


/* ------------------------------------------------------------------ */
/* Provider */
/* ------------------------------------------------------------------ */
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicRole, setClinicRole] = useState<ClinicRole | null>(null);
  const [clinicLoading, setClinicLoading] = useState(true);

  /* -------------------------------------------------------------- */
  /* Auth state listener */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      const isPublicPage =
        pathname === '/' ||
        pathname.startsWith('/features') ||
        pathname.startsWith('/blogs') ||
        pathname.startsWith('/blog') ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');

      const isAuthPage =
        pathname.startsWith('/login') ||
        pathname.startsWith('/signup') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password');

      /* -------------------- NOT LOGGED IN -------------------- */
      if (!currentUser) {
        setClinicId(null);
        setClinicRole(null);
        setClinicLoading(false);

        if (!isPublicPage) {
          router.replace('/login');
        }
        return;
      }

      /* -------------------- LOGGED IN -------------------- */
      if (isAuthPage) {
        router.replace('/dashboard');
      }

      if (pathname === '/') {
        router.replace('/dashboard');
      }

      /* -------------------- LOAD CLINIC CONTEXT -------------------- */
      try {
        setClinicLoading(true);

        const userRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeUserDoc = onSnapshot(userRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setClinicId(data.clinicId ?? null);
            setClinicRole((data.role as ClinicRole) ?? null);
          } else {
            setClinicId(null);
            setClinicRole(null);
          }
          setClinicLoading(false);
        }, (error) => {
          console.error('Failed to load clinic context', error);
          setClinicId(null);
          setClinicRole(null);
          setClinicLoading(false);
        });

      } catch (error) {
        console.error('Failed to initialize clinic context listener', error);
        setClinicId(null);
        setClinicRole(null);
        setClinicLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [auth, db, router, pathname]);

  /* ------------------------------------------------------------------ */
  /* Provider value */
  /* ------------------------------------------------------------------ */
  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        clinicId,
        clinicRole,
        clinicLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
