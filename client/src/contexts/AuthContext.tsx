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
const USER_KEY = 'stratalink_user';

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() >= exp;
  } catch {
    return true;
  }
}

async function validateSessionWithBackend(token: string): Promise<PublicUser | null> {
  try {
    const res = await fetch('/api/auth/session', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      return null;
    }
    
    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        if (isTokenExpired(storedToken)) {
          console.log('Token expired (client-side check), clearing auth state');
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem('stratalink_temp_token');
          localStorage.removeItem('stratalink_temp_email');
        } else {
          const validatedUser = await validateSessionWithBackend(storedToken);
          
          if (validatedUser) {
            setUser(validatedUser);
          } else {
            console.log('Token invalid (backend check), clearing auth state');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            localStorage.removeItem('stratalink_temp_token');
            localStorage.removeItem('stratalink_temp_email');
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
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY);
  };

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
