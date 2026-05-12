
'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

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

        if (!isAuthPage) {
          router.replace('/login');
        }
        return;
      }

      /* -------------------- LOGGED IN -------------------- */
      if (isAuthPage) {
        router.replace('/');
      }

      /* -------------------- LOAD CLINIC CONTEXT -------------------- */
      try {
        setClinicLoading(true);

        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          setClinicId(data.clinicId ?? null);
          setClinicRole(
            (data.role as ClinicRole) ?? null
          );
        } else {
          setClinicId(null);
          setClinicRole(null);
        }
      } catch (error) {
        console.error('Failed to load clinic context', error);
        setClinicId(null);
        setClinicRole(null);
      } finally {
        setClinicLoading(false);
      }
    });

    return () => unsubscribe();
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
