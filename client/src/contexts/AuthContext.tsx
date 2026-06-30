import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { PublicUser } from '@shared/schema';

interface AuthContextType {
  user: PublicUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, user: PublicUser) => void;
  logout: () => void;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'stratalink_access_token';
const USER_KEY  = 'stratalink_user';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

/**
 * Returns:
 *  - PublicUser   → backend confirmed session is valid
 *  - null         → backend explicitly rejected the token (clear auth)
 *  - 'unreachable'→ could not reach backend (network error / server restart)
 *                   → caller should trust local credentials
 */
async function validateSessionWithBackend(
  token: string,
): Promise<PublicUser | null | 'unreachable'> {
  try {
    const res = await fetch('/api/auth/session', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000), // 5 s — fail fast on Replit restart
    });

    if (!res.ok) return null; // 401/403 — token genuinely rejected

    const data = await res.json();
    return data.user ?? null;
  } catch {
    // Network error, timeout, or server not yet ready — don't log the user out
    return 'unreachable';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser  = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          // JWT is expired client-side — clear and force re-login
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem('stratalink_temp_token');
          localStorage.removeItem('stratalink_temp_email');
        } else {
          const result = await validateSessionWithBackend(storedToken);

          if (result === 'unreachable') {
            // Backend temporarily unavailable (Replit glitch/restart).
            // Trust the stored credentials so the user stays on their screen.
            try {
              const parsedUser = JSON.parse(storedUser) as PublicUser;
              setUser(parsedUser);
            } catch {
              // Corrupt stored data — clear and force re-login
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(USER_KEY);
            }
          } else if (result === null) {
            // Backend explicitly rejected — token revoked or invalid
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem('stratalink_temp_token');
            localStorage.removeItem('stratalink_temp_email');
          } else {
            // Valid, confirmed session
            setUser(result);
          }
        }
      }

      setIsLoading(false);
    };

    validateSession();
  }, []);

  const login = (accessToken: string, userData: PublicUser) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    localStorage.removeItem('stratalink_temp_token');
    localStorage.removeItem('stratalink_temp_email');
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('stratalink_temp_token');
    localStorage.removeItem('stratalink_temp_email');
    localStorage.removeItem('stratalink_last_route');
    setUser(null);
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    getToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
