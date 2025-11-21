import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { LandingHero } from "@/components/landing-hero";
import { useAuth } from '@/contexts/AuthContext';

export default function Landing() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation('/platform');
    }
  }, [isAuthenticated, isLoading, setLocation]);

  return <LandingHero />;
}
