'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Hospital, CheckCircle2, Clock, AlertTriangle, ArrowRight, Loader2, LogIn, ArrowLeft, XCircle } from 'lucide-react';

import { useUser } from '@/firebase';
import {
  getClinicByInviteCode,
  getPendingRequest,
  joinClinicWithCode,
  cancelPendingRequest,
  type ClinicPreview,
  type PendingRequestData,
} from '@/services/clinic-service';
import { useToast } from '@/hooks/use-toast';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogoCC } from '@/components/icons';

function JoinClinicContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, clinicId: userClinicId, loading: authLoading } = useUser();

  const codeParam = (searchParams.get('code') || '').trim();

  // Local state
  const [inviteCodeInput, setInviteCodeInput] = useState(codeParam);
  const [activeCode, setActiveCode] = useState(codeParam);

  const [clinic, setClinic] = useState<ClinicPreview | null>(null);
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError, setClinicError] = useState<string | null>(null);

  const [pendingRequest, setPendingRequest] = useState<PendingRequestData | null>(null);
  const [checkingPending, setCheckingPending] = useState(false);

  // Form inputs
  const [requestedRole, setRequestedRole] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Keep active code synced with query param
  useEffect(() => {
    if (codeParam) {
      setActiveCode(codeParam);
      setInviteCodeInput(codeParam);
    }
  }, [codeParam]);

  // Load clinic information when activeCode changes
  useEffect(() => {
    if (!activeCode) {
      setClinic(null);
      setClinicError(null);
      return;
    }

    let isCurrent = true;
    setClinicLoading(true);
    setClinicError(null);

    getClinicByInviteCode(activeCode)
      .then((data) => {
        if (!isCurrent) return;
        if (data) {
          setClinic(data);
          setClinicError(null);
        } else {
          setClinic(null);
          setClinicError('Invalid or expired invite code. Please verify the link or enter a valid code.');
        }
      })
      .catch((err: any) => {
        if (!isCurrent) return;
        console.error('Error fetching clinic:', err);
        // If not logged in and permission denied, Firestore requires login
        if (err?.code === 'permission-denied' && !user) {
          setClinic(null);
          setClinicError(null);
        } else {
          setClinicError(err.message || 'Unable to load clinic details');
        }
      })
      .finally(() => {
        if (isCurrent) setClinicLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [activeCode, user]);

  // Check pending request status if user and clinic are loaded
  useEffect(() => {
    if (!user || !clinic) {
      setPendingRequest(null);
      return;
    }

    let isCurrent = true;
    setCheckingPending(true);

    getPendingRequest(clinic.clinicId, user.uid)
      .then((req) => {
        if (isCurrent) setPendingRequest(req);
      })
      .catch((err) => {
        console.error('Error checking pending status:', err);
      })
      .finally(() => {
        if (isCurrent) setCheckingPending(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [user, clinic, justSubmitted]);

  // Handle manual code submit
  const handleApplyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    const clean = inviteCodeInput.trim().toUpperCase();
    setActiveCode(clean);
    router.replace(`/join?code=${encodeURIComponent(clean)}`);
  };

  // Handle join request submission
  const handleSubmitRequest = async () => {
    if (!user) {
      const returnUrl = `/join?code=${encodeURIComponent(activeCode)}`;
      router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!requestedRole) {
      toast({
        title: 'Please select your role',
        description: 'Choose your role (e.g. Doctor, Receptionist, Assistant) to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await joinClinicWithCode({
        userId: user.uid,
        inviteCode: activeCode,
        requestedRole,
        note: note.trim(),
      });

      toast({
        title: 'Join request sent!',
        description: 'The clinic administrator has been notified and will review your request.',
      });

      setJustSubmitted(true);
      setPendingRequest({
        displayName: user.displayName || 'You',
        email: user.email,
        requestedRole,
        note: note.trim(),
        requestedAt: new Date(),
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to send request',
        description: err.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle request cancellation
  const handleCancelRequest = async () => {
    if (!user || !clinic) return;

    setIsCancelling(true);
    try {
      await cancelPendingRequest({
        clinicId: clinic.clinicId,
        userId: user.uid,
      });

      toast({
        title: 'Request cancelled',
        description: 'Your pending join request has been withdrawn.',
      });

      setPendingRequest(null);
      setJustSubmitted(false);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Failed to cancel request',
        description: err.message || 'Could not cancel request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  /* ============================================================
     RENDER: Loading Authentication
  ============================================================ */
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-muted-foreground">Checking authentication…</p>
      </div>
    );
  }

  /* ============================================================
     RENDER: User Not Logged In
  ============================================================ */
  if (!user) {
    const returnUrl = activeCode ? `/join?code=${encodeURIComponent(activeCode)}` : '/join';
    const loginLink = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-1">
              <LogoCC className="h-10 w-10" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinic@Click</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Join an existing dental practice</p>
          </div>

          <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2">
                <Hospital className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">You&apos;re Invited!</CardTitle>
              <CardDescription>
                You have received an invite to join a clinic on Clinic@Click.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {activeCode ? (
                <div className="rounded-lg border border-slate-200 dark:border-[#333] bg-slate-50 dark:bg-[#252525] p-3 text-center space-y-1">
                  <span className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wider">
                    Invite Code
                  </span>
                  <div className="font-mono text-lg font-bold tracking-widest text-blue-600 dark:text-blue-400">
                    {activeCode}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApplyCode} className="space-y-2">
                  <Label htmlFor="guest-invite-code" className="text-xs font-semibold">Enter Invite Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="guest-invite-code"
                      placeholder="e.g. 8-digit code"
                      value={inviteCodeInput}
                      onChange={(e) => setInviteCodeInput(e.target.value)}
                      className="font-mono uppercase"
                    />
                    <Button type="submit" variant="secondary">Apply</Button>
                  </div>
                </form>
              )}

              <p className="text-sm text-muted-foreground text-center">
                Please sign in or create an account to view the clinic details and send your join request.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                <Link href={loginLink}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In / Register to Join
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full text-slate-500">
                <Link href="/">Back to Home</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: User Already Has a Clinic
  ============================================================ */
  if (userClinicId) {
    const isSameClinic = clinic && clinic.clinicId === userClinicId;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md space-y-6">
          <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E]">
            <CardHeader className="text-center pb-3">
              <div className={`mx-auto w-12 h-12 rounded-full ${isSameClinic ? 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'} flex items-center justify-center mb-2`}>
                {isSameClinic ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <CardTitle className="text-xl">
                {isSameClinic ? 'Already a Member' : 'Already in a Clinic'}
              </CardTitle>
              <CardDescription>
                {isSameClinic
                  ? `You are already a member of ${clinic?.name || 'this clinic'}.`
                  : 'Your account is already linked to a clinic. You must leave your current clinic before joining another.'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full h-10 font-medium">
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1.5" />
                </Link>
              </Button>
              {!isSameClinic && (
                <Button asChild variant="outline" className="w-full h-10 font-medium">
                  <Link href="/clinic">Manage Clinic Membership</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: No Code Provided Yet
  ============================================================ */
  if (!activeCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md space-y-6">
          <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center mb-2">
                <Hospital className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Join a Clinic</CardTitle>
              <CardDescription>
                Enter the invite code shared with you by your clinic administrator.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleApplyCode}>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="enter-invite-code" className="text-sm font-semibold">Invite Code</Label>
                  <Input
                    id="enter-invite-code"
                    placeholder="e.g. 8-digit code"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    className="font-mono uppercase h-11 text-base tracking-widest"
                    autoFocus
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 pt-2">
                <Button type="submit" disabled={!inviteCodeInput.trim()} className="w-full h-10 font-medium">
                  Continue
                </Button>
                <Button asChild variant="ghost" className="w-full text-slate-500">
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: Loading Clinic Details
  ============================================================ */
  if (clinicLoading || checkingPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-muted-foreground">Looking up clinic details…</p>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: Invalid Code / Clinic Error
  ============================================================ */
  if (clinicError || !clinic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md space-y-6">
          <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E]">
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-2">
                <XCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Invite Code Not Found</CardTitle>
              <CardDescription>
                {clinicError || `We couldn't find an active clinic with the code "${activeCode}".`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleApplyCode} className="space-y-3">
                <Label htmlFor="retry-code" className="text-xs font-semibold">Try another code:</Label>
                <div className="flex gap-2">
                  <Input
                    id="retry-code"
                    placeholder="e.g. 8-digit code"
                    value={inviteCodeInput}
                    onChange={(e) => setInviteCodeInput(e.target.value)}
                    className="font-mono uppercase"
                  />
                  <Button type="submit" variant="secondary">Apply</Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button asChild variant="outline" className="w-full h-10 font-medium">
                <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: Pending Request Exists (Waiting for Admin Approval)
  ============================================================ */
  if (pendingRequest) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
        <div className="w-full max-w-md space-y-6">
          <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E] overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500" />
            <CardHeader className="text-center pb-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 border border-amber-200 dark:border-amber-900">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
              <Badge variant="outline" className="mx-auto bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
                Awaiting Approval
              </Badge>
              <CardTitle className="text-xl mt-2">Request Pending</CardTitle>
              <CardDescription>
                Your request to join <span className="font-semibold text-slate-800 dark:text-slate-200">{clinic.name}</span> has been submitted.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-lg border border-slate-200 dark:border-[#333] bg-slate-50/70 dark:bg-[#252525] p-4 space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#333]">
                  <span className="text-muted-foreground">Requested Role:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {pendingRequest.requestedRole || 'Member'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-[#333]">
                  <span className="text-muted-foreground">Applicant:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {user.displayName || user.email}
                  </span>
                </div>
                {clinic.address && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Clinic Address:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {clinic.address}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center">
                The clinic administrator has been notified. You will get immediate access to the clinic dashboard once they approve your request.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full h-10 font-medium">
                <Link href="/dashboard">Return to Dashboard</Link>
              </Button>
              <Button
                variant="ghost"
                onClick={handleCancelRequest}
                disabled={isCancelling}
                className="w-full text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {isCancelling ? 'Cancelling request…' : 'Withdraw / Cancel Request'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  /* ============================================================
     RENDER: Ready to Send Join Request
  ============================================================ */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50/60 dark:bg-[#121212]">
      <div className="w-full max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <Badge variant="outline" className="font-mono text-xs">
            Code: {activeCode}
          </Badge>
        </div>

        <Card className="border shadow-lg shadow-slate-200/50 dark:shadow-none dark:border-[#2D2D2D] dark:bg-[#1E1E1E] overflow-hidden">
          {/* Clinic Header Banner */}
          <div className="p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-transparent border-b border-slate-100 dark:border-[#2D2D2D] flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0 overflow-hidden border border-blue-200 dark:border-blue-800">
              {clinic.logoUrl ? (
                <img src={clinic.logoUrl} alt={clinic.name} className="h-full w-full object-cover" />
              ) : (
                <Hospital className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                Join Request
              </span>
              <h1 className="text-xl font-bold truncate text-slate-900 dark:text-white">{clinic.name}</h1>
              <p className="text-xs text-muted-foreground truncate">
                {[clinic.clinicType, clinic.address].filter(Boolean).join(' • ') || 'Dental Clinic'}
              </p>
            </div>
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Applicant Identity Card */}
            <div className="rounded-lg border border-slate-200 dark:border-[#333] bg-slate-50/50 dark:bg-[#252525] p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Requesting as:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[250px]">
                {user.displayName || user.email}
              </span>
            </div>

            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label htmlFor="join-role" className="text-sm font-semibold">
                What is your role in this clinic? <span className="text-red-500">*</span>
              </Label>
              <Select value={requestedRole} onValueChange={setRequestedRole}>
                <SelectTrigger id="join-role" className="w-full h-11 text-base">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Doctor">
                    <span className="font-medium text-blue-600 dark:text-blue-400">Doctor / Dentist</span>
                  </SelectItem>
                  <SelectItem value="Receptionist">
                    <span className="font-medium text-purple-600 dark:text-purple-400">Receptionist</span>
                  </SelectItem>
                  <SelectItem value="Dental Assistant">
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Dental Assistant</span>
                  </SelectItem>
                  <SelectItem value="Hygienist">
                    <span className="font-medium text-teal-600 dark:text-teal-400">Hygienist</span>
                  </SelectItem>
                  <SelectItem value="Office Manager">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400">Office Manager</span>
                  </SelectItem>
                  <SelectItem value="Other">
                    <span className="font-medium text-slate-600 dark:text-slate-400">Other Staff Member</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Doctors will automatically receive clinical access once approved by the admin.
              </p>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5">
              <Label htmlFor="join-note" className="text-sm font-semibold">
                Note for Administrator <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                id="join-note"
                placeholder="e.g. Hi Dr. Sharma, this is Dr. Patel joining the Tuesday evening shift."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-0 flex flex-col gap-3">
            <Button
              onClick={handleSubmitRequest}
              disabled={isSubmitting || !requestedRole}
              className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending Request…
                </>
              ) : (
                'Send Join Request'
              )}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              By sending this request, the clinic administrator will review your profile to approve membership.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-3" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <JoinClinicContent />
    </Suspense>
  );
}

