import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, ArrowRight } from 'lucide-react';
import type { LoginRequest, LoginResponse } from '@shared/schema';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { login, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // CRITICAL: Force logout on login page to ensure fresh 2FA flow
  useEffect(() => {
    logout();
  }, [logout]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    try {
      const res = await apiRequest('POST', '/api/auth/login', data as LoginRequest);
      const response = await res.json() as LoginResponse;

      if (response.requires2FA) {
        localStorage.setItem('stratalink_temp_token', response.tempToken!);
        localStorage.setItem('stratalink_temp_email', data.email);
        setLocation('/verify-otp');
      } else {
        login(response.accessToken!, response.user!);
        
        toast({
          title: 'Login successful',
          description: 'Welcome to StrataLink Labs Terminal',
        });

        const lastRoute = localStorage.getItem('stratalink_last_route');
        setLocation(lastRoute ?? '/platform');
      }
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold tracking-tight">
              STRATALINK LABS
            </CardTitle>
          </div>
          <CardDescription className="text-base">
            Institutional Liquidity Intelligence Terminal
          </CardDescription>
          <div className="h-px bg-border/50 mt-4" />
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Email Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="analyst@institution.com"
                        disabled={isLoading}
                        data-testid="input-email"
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter your password"
                        disabled={isLoading}
                        data-testid="input-password"
                        className="font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  'Authenticating...'
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
