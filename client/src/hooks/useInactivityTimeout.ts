import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useInactivityTimeout() {
  const [location, setLocation] = useLocation();
  const { logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only apply timeout to platform pages
    const isPlatformPage = location.startsWith('/platform');
    
    if (!isPlatformPage || !isAuthenticated) {
      // Clear any existing timeout if we're not on a platform page
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const handleInactivity = () => {
      console.log('[INACTIVITY] Session timeout after 5 minutes of inactivity');
      logout();
      setLocation('/');
    };

    const resetTimeout = () => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set new timeout
      timeoutRef.current = setTimeout(handleInactivity, INACTIVITY_TIMEOUT);
    };

    // Initialize timeout
    resetTimeout();

    // Track user interactions
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimeout, { passive: true });
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [location, logout, setLocation, isAuthenticated]);
}
