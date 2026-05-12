'use client';

import { Suspense, useState, type FormEvent, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { verifyResetCode, confirmNewPassword } from '@/services/auth-service';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('oobCode');
    if (!code) {
      setError('Invalid reset link. No code provided.');
      setLoading(false);
      return;
    }
    setOobCode(code);
    verifyResetCode(code)
      .then(() => setLoading(false))
      .catch(() => {
        setError('Invalid or expired password reset link. Please request a new one.');
        setLoading(false);
      });
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    if (!oobCode) return;

    setLoading(true);
    try {
      await confirmNewPassword(oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to reset password.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Loader2 className="mx-auto h-8 w-8 animate-spin" />;
  }
  
  if (error) {
     return (
        <div className="text-center text-destructive">
            <p>{error}</p>
            <Button asChild variant="link" className="mt-4">
                <Link href="/forgot-password">Request a new link</Link>
            </Button>
        </div>
     )
  }
  
  if (success) {
    return (
        <div className="text-center">
            <p className="text-muted-foreground mb-4">Your password has been reset successfully.</p>
            <Button asChild>
                <Link href="/login">Proceed to Login</Link>
            </Button>
        </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
      </Button>
    </form>
  );
}


export default function ResetPasswordPage() {
    return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>
            Enter a new password for your account below.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin" />}>
                <ResetPasswordForm />
            </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

