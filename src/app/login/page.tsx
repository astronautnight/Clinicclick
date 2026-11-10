'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoCC } from '@/components/icons';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import type { AuthError } from 'firebase/auth';

import {
  signInWithGoogle,
  signInWithGoogleNative,
  signInWithEmail,
  signUpWithEmail,
  updateUserProfile,
  getPostLoginRedirect,
} from '@/services/auth-service';

/* -------------------------------------------------
   PASSWORD VALIDATION
------------------------------------------------- */
function isStrongPassword(password: string) {
  const hasMinLength = password.length >= 6;
  const numbers = password.replace(/[^0-9]/g, '').length >= 2;
  const special = /[@$!%*#?&]/.test(password);
  return hasMinLength && numbers && special;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrlParam = searchParams.get('returnUrl');
  const { user, loading } = useUser();
  const { toast } = useToast();

  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const native = navigator.userAgent.includes('ClinicClickApp');
    setIsNative(native);
  }, []);

  /* -------------------------------------------------
     GOOGLE SIGN IN
  ------------------------------------------------- */
  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);

    // PWA/Android: native account picker via AndroidBridge
    if (isNative) {
      try {
        const loggedUser = await signInWithGoogleNative();
        toast({ title: 'Sign-In Successful', description: 'Welcome back!' });
        const destination = await getPostLoginRedirect(loggedUser.uid, returnUrlParam);
        router.push(destination);
      } catch (error) {
        const err = error as AuthError;
        toast({
          title: 'Google Sign-In Failed',
          description: err.message,
          variant: 'destructive',
        });
      } finally {
        setIsGoogleSubmitting(false);
      }
      return;
    }

    // Web: popup flow
    try {
      const loggedUser = await signInWithGoogle();
      toast({ title: 'Sign-In Successful', description: 'Welcome back!' });
      const destination = await getPostLoginRedirect(loggedUser.uid, returnUrlParam);
      router.push(destination);
    } catch (error) {
      const err = error as AuthError;
      let errorMessage = err.message || 'An unexpected error occurred.';
      if (err.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign-in cancelled. Please try again.';
      } else if (err.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups for this site and try again.';
      } else if (err.code === 'auth/unauthorized-domain') {
        errorMessage = 'This domain is not authorized. Please contact support.';
      }
      toast({
        title: 'Google Sign-In Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  /* -------------------------------------------------
     LOGIN
  ------------------------------------------------- */
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEmailSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;

    try {
      const loggedUser = await signInWithEmail(email, password);

      // Email/password users must verify before accessing the app
      if (!loggedUser.emailVerified) {
        router.push('/verify-email');
        return;
      }

      const destination = await getPostLoginRedirect(loggedUser.uid, returnUrlParam);
      router.push(destination);
    } catch (error) {
      const err = error as AuthError;
      toast({ title: 'Login Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  /* -------------------------------------------------
     SIGN UP
  ------------------------------------------------- */
  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsEmailSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const fullName = fd.get('fullName') as string;
    const email = fd.get('email') as string;
    const password = fd.get('password') as string;
    const confirm = fd.get('confirmPassword') as string;

    if (!fullName.trim()) {
      toast({ title: 'Full name required', variant: 'destructive' });
      setIsEmailSubmitting(false);
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      setIsEmailSubmitting(false);
      return;
    }
    if (!isStrongPassword(password)) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters, 2 numbers, and a special character (@$!%*#?&).',
        variant: 'destructive',
      });
      setIsEmailSubmitting(false);
      return;
    }

    try {
      const newUser = await signUpWithEmail(email, password, fullName);
      await updateUserProfile(newUser.uid, { displayName: fullName });
      toast({
        title: 'Account created!',
        description: 'Please verify your email address to continue.',
      });
      // Always redirect new email/password users to the verification page
      router.push('/verify-email');
    } catch (error: any) {
      toast({
        title: 'Sign Up Failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  /* -------------------------------------------------
     LOADING / REDIRECT
  ------------------------------------------------- */
  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isSubmitting = isEmailSubmitting || isGoogleSubmitting;

  /* -------------------------------------------------
     UI
  ------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50/40">
      <div className="w-full max-w-md flex flex-col items-center gap-5">
        <Card className="w-full shadow-lg border-gray-100">
          <CardHeader className="text-center">
            <LogoCC className="mx-auto mb-3 h-12 w-12 text-primary" />
            <CardTitle className="text-3xl font-bold">Clinic@Click</CardTitle>
            <CardDescription className="text-base">Dental Practice Management</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Google button — shown on both web and PWA */}
            <Button
              variant="outline"
              className="w-full mb-4 flex items-center justify-center gap-2 h-11 text-base font-medium"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
            >
              {isGoogleSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1H12v2.8h5.35c-.45 2.35-2.45 3.8-5.35 3.8a6 6 0 1 1 0-12c1.35 0 2.6.45 3.55 1.3l2.15-2.15A8.9 8.9 0 1 0 21 12c0-.3-.05-.6-.1-.9z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or with email</span>
              </div>
            </div>

            <Tabs defaultValue="login">
              <TabsList className="grid grid-cols-2">
                <TabsTrigger value="login" disabled={isSubmitting}>Login</TabsTrigger>
                <TabsTrigger value="signup" disabled={isSubmitting}>Sign Up</TabsTrigger>
              </TabsList>

              {/* LOGIN */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                  <div>
                    <Label>Email</Label>
                    <Input name="email" type="email" required disabled={isSubmitting} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <Label>Password</Label>
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                    <Input name="password" type="password" required disabled={isSubmitting} />
                  </div>
                  <Button className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
                    {isEmailSubmitting ? <Loader2 className="animate-spin" /> : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              {/* SIGN UP */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 pt-4">
                  <div>
                    <Label>Full Name</Label>
                    <Input name="fullName" required disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input name="email" type="email" required disabled={isSubmitting} />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input name="password" type="password" required disabled={isSubmitting} />
                    <p className="text-xs text-muted-foreground mt-1">
                      At least 6 characters, 2 numbers, and a special character (@$!%*#?&).
                    </p>
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input name="confirmPassword" type="password" required disabled={isSubmitting} />
                  </div>
                  <Button className="w-full h-11 text-base font-semibold" disabled={isSubmitting}>
                    {isEmailSubmitting ? <Loader2 className="animate-spin" /> : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* PROMINENT CENTERED GO HOME LINK */}
        <Link 
          href="/" 
          className="text-base font-semibold text-gray-700 hover:text-[#2383e2] transition-colors flex items-center justify-center gap-2 py-2 px-4 rounded-lg hover:bg-white/80"
        >
          ← Go Home (clinicatclick.com)
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}