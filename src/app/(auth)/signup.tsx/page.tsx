'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { signUpWithEmail } from '@/services/auth-service';
import { createClinic, joinClinicWithCode } from '@/services/clinic-service';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

type Mode = 'create' | 'join';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('create');
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  /* -------------------------------------------------- */
  /* Password validation (MANDATORY) */
  /* -------------------------------------------------- */
  const validatePassword = (pwd: string) => {
    if (pwd.length < 12) return 'Password must be at least 12 characters';
    if (!/[a-z]/.test(pwd)) return 'Include at least one lowercase letter';
    if (!/[A-Z]/.test(pwd)) return 'Include at least one uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Include at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd))
      return 'Include at least one special character';
    return null;
  };

  /* -------------------------------------------------- */
  /* Signup handler */
  /* -------------------------------------------------- */
  const handleSignup = async () => {
    if (loading) return;

    if (!email || !password) {
      toast({ title: 'Email and password required', variant: 'destructive' });
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      toast({ title: 'Weak password', description: pwdError, variant: 'destructive' });
      return;
    }

    if (mode === 'create' && !clinicName.trim()) {
      toast({ title: 'Clinic name required', variant: 'destructive' });
      return;
    }

    if (mode === 'join' && !inviteCode.trim()) {
      toast({ title: 'Invite code required', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);

      const user = await signUpWithEmail(email, password);

      if (mode === 'create') {
        await createClinic({
          ownerUid: user.uid,
          clinicName: clinicName.trim(),
        });
      } else {
        await joinClinicWithCode({
          userId: user.uid,
          inviteCode: inviteCode.trim(),
        });
      }

      toast({ title: 'Account created successfully' });
      router.push('/');
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Signup failed',
        description: err?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /* UI */
  /* -------------------------------------------------- */
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your account</CardTitle>
          <CardDescription>
            Create a clinic or join an existing one
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'create' ? 'default' : 'outline'}
              onClick={() => setMode('create')}
              className="flex-1"
            >
              Create Clinic
            </Button>
            <Button
              type="button"
              variant={mode === 'join' ? 'default' : 'outline'}
              onClick={() => setMode('join')}
              className="flex-1"
            >
              Join Clinic
            </Button>
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Clinic Name</Label>
              <Input
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="My Dental Clinic"
              />
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-2">
              <Label>Invite Code</Label>
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="YOUR-CODE"
              />
            </div>
          )}

          <Button className="w-full" onClick={handleSignup} disabled={loading}>
            {loading ? 'Creating account…' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
