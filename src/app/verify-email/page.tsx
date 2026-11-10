'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendEmailVerification,
  reload,
  getAuth,
  signOut,
} from 'firebase/auth';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { LogoCC } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, RefreshCw, LogOut, CheckCircle2 } from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Firebase singleton (same pattern as auth-service.ts)               */
/* ------------------------------------------------------------------ */
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /* On mount: grab current user's email; redirect away if no user   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      router.replace('/login');
      return;
    }

    // If the user is already verified (e.g., Google), redirect them out
    if (user.emailVerified) {
      router.replace('/dashboard');
      return;
    }

    setEmail(user.email);
  }, [router]);

  /* ---------------------------------------------------------------- */
  /* Cooldown ticker                                                  */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(
      () => setCooldown((prev) => Math.max(0, prev - 1)),
      1000
    );
    return () => window.clearInterval(id);
  }, [cooldown]);

  /* ---------------------------------------------------------------- */
  /* Check verification status                                        */
  /* ---------------------------------------------------------------- */
  const handleCheckVerification = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    setIsCheckingVerification(true);
    setPendingMessage(null);

    try {
      // Reload the user object from Firebase to get the latest emailVerified flag
      await reload(user);

      if (user.emailVerified) {
        // Force-refresh the ID token so Firestore rules see email_verified=true immediately
        await user.getIdToken(/* forceRefresh */ true);

        toast({
          title: 'Email verified!',
          description: 'Redirecting you to your dashboard…',
        });

        // Small delay so the toast is visible before navigation
        setTimeout(() => router.replace('/dashboard'), 800);
      } else {
        setPendingMessage(
          "Your email hasn't been verified yet. Please check your inbox and click the verification link, then try again."
        );
      }
    } catch (err: any) {
      console.error('Failed to reload user:', err);
      toast({
        title: 'Check failed',
        description: err?.message || 'Could not check verification status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingVerification(false);
    }
  }, [router, toast]);

  /* ---------------------------------------------------------------- */
  /* Resend verification email                                        */
  /* ---------------------------------------------------------------- */
  const handleResend = useCallback(async () => {
    if (cooldown > 0 || isSendingEmail) return;

    const user = auth.currentUser;
    if (!user) {
      router.replace('/login');
      return;
    }

    setIsSendingEmail(true);
    setPendingMessage(null);

    try {
      await sendEmailVerification(user);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast({
        title: 'Verification email sent',
        description: `A new link has been sent to ${user.email}.`,
      });
    } catch (err: any) {
      console.error('Failed to resend verification email:', err);
      let message = 'Could not resend the verification email. Please try again later.';
      if (err?.code === 'auth/too-many-requests') {
        message = 'Too many requests. Please wait a few minutes before trying again.';
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
      toast({
        title: 'Resend failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  }, [cooldown, isSendingEmail, router, toast]);

  /* ---------------------------------------------------------------- */
  /* Sign out                                                         */
  /* ---------------------------------------------------------------- */
  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (err) {
      console.error('Sign-out error:', err);
      setIsSigningOut(false);
    }
  }, [router]);

  /* ---------------------------------------------------------------- */
  /* Auto-check when the tab becomes visible (user returns from inbox) */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      const user = auth.currentUser;
      if (!user || user.emailVerified) return;

      try {
        await reload(user);
        if (user.emailVerified) {
          await user.getIdToken(true);
          toast({
            title: 'Email verified!',
            description: 'Redirecting you to your dashboard…',
          });
          setTimeout(() => router.replace('/dashboard'), 800);
        }
      } catch {
        // Silent — user may not have verified yet
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router, toast]);

  /* ---------------------------------------------------------------- */
  /* Loading state while we detect user                               */
  /* ---------------------------------------------------------------- */
  if (!email) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Main UI                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/40">
      <div className="w-full max-w-md flex flex-col items-center gap-5">
        <Card className="w-full shadow-lg border-gray-100">
          <CardHeader className="text-center">
            {/* Logo */}
            <LogoCC className="mx-auto mb-3 h-12 w-12 text-primary" />
            <CardTitle className="text-3xl font-bold">Clinic@Click</CardTitle>

            {/* Envelope icon */}
            <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>

            <CardTitle className="mt-4 text-xl font-semibold">
              Verify your email address
            </CardTitle>
            <CardDescription className="mt-2 text-base leading-relaxed">
              We sent a verification link to{' '}
              <span className="font-semibold text-foreground break-all">
                {email}
              </span>
              . Click the link in that email to activate your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {/* Pending / error message */}
            {pendingMessage && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {pendingMessage}
              </div>
            )}

            {/* Primary CTA */}
            <Button
              className="w-full h-11 text-base font-semibold"
              onClick={handleCheckVerification}
              disabled={isCheckingVerification || isSigningOut}
            >
              {isCheckingVerification ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isCheckingVerification
                ? 'Checking verification…'
                : "I've verified my email"}
            </Button>

            {/* Resend button with cooldown */}
            <Button
              variant="outline"
              className="w-full h-11 text-base"
              onClick={handleResend}
              disabled={cooldown > 0 || isSendingEmail || isSigningOut}
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : isSendingEmail
                ? 'Sending…'
                : 'Resend verification email'}
            </Button>

            {/* Divider */}
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  or
                </span>
              </div>
            </div>

            {/* Sign out */}
            <Button
              variant="ghost"
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={handleSignOut}
              disabled={isCheckingVerification || isSendingEmail || isSigningOut}
            >
              {isSigningOut ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Sign out
            </Button>
          </CardContent>
        </Card>

        <p className="text-sm text-center text-muted-foreground px-4">
          Didn&apos;t receive the email? Check your spam folder or use the
          resend button above.
        </p>
      </div>
    </div>
  );
}

