
'use client';

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
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
  /* Auth state listener and clinic context                         */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;
    let active = true;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;

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
        pathname.startsWith('/join') ||
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

      /* -------------------- LOAD CLINIC CONTEXT -------------------- */
      setClinicLoading(true);

      const userRef = doc(db, 'users', currentUser.uid);

      try {
        unsubscribeUserDoc = onSnapshot(
          userRef,
          (snap) => {
            if (!active) return;

            let currentClinicId: string | null = null;
            let currentRole: ClinicRole | null = null;

            if (snap.exists()) {
              const data = snap.data();
              currentClinicId = data.clinicId ?? null;
              currentRole = (data.role as ClinicRole) ?? null;
              setClinicId(currentClinicId);
              setClinicRole(currentRole);
            } else {
              setClinicId(null);
              setClinicRole(null);
            }

            setClinicLoading(false);

            /* -------------------- POST-AUTH REDIRECT -------------------- */
            if (isAuthPage || pathname === '/') {
              let returnUrl: string | null = null;
              if (typeof window !== 'undefined') {
                const params = new URLSearchParams(window.location.search);
                const r = params.get('returnUrl');
                if (
                  r &&
                  r.startsWith('/') &&
                  !r.startsWith('/login') &&
                  !r.startsWith('/signup') &&
                  r !== '/dashboard'
                ) {
                  returnUrl = r;
                }
              }

              if (returnUrl) {
                router.replace(returnUrl);
              } else if (currentClinicId) {
                router.replace('/dashboard');
              } else {
                router.replace('/clinic?mode=create');
              }
            } else if (pathname === '/dashboard' && !currentClinicId) {
              // Direct navigation to /dashboard without a clinic -> redirect to onboarding
              router.replace('/clinic?mode=create');
            }
          },
          (error) => {
            if (!active) return;

            console.error('Failed to load clinic context', error);
            setClinicId(null);
            setClinicRole(null);
            setClinicLoading(false);
          }
        );
      } catch (error) {
        console.error('Failed to initialize clinic context listener', error);
        setClinicId(null);
        setClinicRole(null);
        setClinicLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribeAuth();

      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, [auth, db, router, pathname]);

  /* ------------------------------------------------------------------ */
  /* Track last activity for authenticated users                         */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    let lastWriteAt = 0;
    let writeInProgress = false;

    const updateActivity = async (force = false) => {
      if (document.visibilityState !== 'visible') return;
      if (writeInProgress) return;

      // Avoid writing more often than once every 15 minutes.
      const now = Date.now();
      if (!force && now - lastWriteAt < 15 * 60 * 1000) return;

      writeInProgress = true;

      try {
        await setDoc(
          userRef,
          { lastActiveAt: serverTimestamp() },
          { merge: true }
        );
        lastWriteAt = Date.now();
      } catch (error) {
        console.error('Failed to update user activity:', error);
      } finally {
        writeInProgress = false;
      }
    };

    // Record activity when the authenticated app becomes active.
    void updateActivity(true);

    const intervalId = window.setInterval(() => {
      void updateActivity();
    }, 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void updateActivity(true);
      }
    };

    const handleUserActivity = () => {
      void updateActivity();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleUserActivity, {
      passive: true,
    });
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [user, db]);

  /* ------------------------------------------------------------------ */
  /* Provider value                                                      */
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
