import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Clock, RefreshCw } from 'lucide-react';
import type { VerifyOTPRequest, VerifyOTPResponse, ResendOTPRequest, ResendOTPResponse } from '@shared/schema';

const otpSchema = z.object({
  otpCode: z.string().length(6, 'OTP must be exactly 6 digits'),
});

type OTPFormData = z.infer<typeof otpSchema>;

export default function VerifyOTPPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(180);
  const [canResend, setCanResend] = useState(false);

  const tempToken = localStorage.getItem('stratalink_temp_token');
  const tempEmail = localStorage.getItem('stratalink_temp_email');

  const form = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otpCode: '',
    },
  });

  useEffect(() => {
    // Check authentication first (highest priority)
    if (!authLoading && isAuthenticated) {
      setLocation('/platform');
      return;
    }
    
    // Only check for temp tokens if not authenticated
    // This prevents redirect to /login when tokens are cleared after successful auth
    if (!authLoading && !isAuthenticated && (!tempToken || !tempEmail)) {
      setLocation('/login');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation, isAuthenticated, authLoading, tempToken, tempEmail]);

  const onSubmit = async (data: OTPFormData) => {
    if (!tempToken) {
      toast({
        title: 'Session expired',
        description: 'Please login again',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setIsLoading(true);
    
    try {
      const res = await apiRequest('POST', '/api/auth/verify-otp', {
        tempToken,
        otpCode: data.otpCode,
      } as VerifyOTPRequest);
      const response = await res.json() as VerifyOTPResponse;

      // Clean up temp credentials
      localStorage.removeItem('stratalink_temp_token');
      localStorage.removeItem('stratalink_temp_email');
      
      // Update auth context - this will trigger the useEffect to redirect to /platform
      login(response.accessToken, response.user);
      
      toast({
        title: 'Authentication successful',
        description: 'Welcome to StrataLink Labs Terminal',
      });
      
      // Note: Redirect handled by useEffect when isAuthenticated becomes true
    } catch (error: any) {
      toast({
        title: 'Verification failed',
        description: error.message || 'Invalid OTP code',
        variant: 'destructive',
      });
      
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!tempToken) {
      toast({
        title: 'Session expired',
        description: 'Please login again',
        variant: 'destructive',
      });
      setLocation('/login');
      return;
    }

    setIsResending(true);
    
    try {
      const res = await apiRequest('POST', '/api/auth/resend-otp', {
        tempToken,
      } as ResendOTPRequest);
      await res.json() as ResendOTPResponse;

      toast({
        title: 'OTP sent',
        description: 'A new verification code has been sent to your email',
      });
      
      setCountdown(180);
      setCanResend(false);
    } catch (error: any) {
      toast({
        title: 'Failed to resend OTP',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold tracking-tight">
              Two-Factor Authentication
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Enter the 6-digit verification code
          </CardDescription>
          <div className="h-px bg-border/50 mt-4" />
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="otpCode"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-center">
                    <FormLabel className="text-sm font-medium">Verification Code</FormLabel>
                    <FormControl>
                      <InputOTP
                        maxLength={6}
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                        data-testid="input-otp"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={1} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={2} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={3} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={4} className="w-12 h-12 text-lg font-mono" />
                          <InputOTPSlot index={5} className="w-12 h-12 text-lg font-mono" />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="font-mono">
                  {countdown > 0 ? `Code expires in ${formatTime(countdown)}` : 'Code expired'}
                </span>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || form.watch('otpCode').length !== 6}
                data-testid="button-verify-otp"
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
            </form>
          </Form>

          <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleResendOTP}
              disabled={!canResend || isResending}
              data-testid="button-resend-otp"
            >
              <RefreshCw className={`h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Sending...' : canResend ? 'Resend Code' : 'Resend Available After Expiry'}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                localStorage.removeItem('stratalink_temp_token');
                localStorage.removeItem('stratalink_temp_email');
                setLocation('/login');
              }}
              data-testid="button-back-to-login"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
