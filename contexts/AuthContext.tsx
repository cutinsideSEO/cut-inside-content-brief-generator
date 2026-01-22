// Auth Context - Provides authentication state throughout the app
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthSession, AccessCode } from '../types/database';
import {
  loginWithAccessCode,
  logout as logoutService,
  getCurrentSession,
  refreshSession,
  isAdmin as checkIsAdmin,
  getCurrentUserId,
  getCurrentUserName,
  getAccessibleClientIds,
  hasClientAccess,
  addClientToUser,
} from '../services/authService';
import { isSupabaseConfigured } from '../services/supabaseClient';

// ============================================
// Types
// ============================================
interface AuthContextType {
  // State
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // User info
  user: AccessCode | null;
  userId: string | null;
  userName: string | null;
  isAdmin: boolean;

  // Actions
  login: (code: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;

  // Client access
  accessibleClientIds: string[];
  checkClientAccess: (clientId: string) => boolean;
  addClientAccess: (clientId: string) => Promise<boolean>;

  // Utilities
  isConfigured: boolean;
}

// ============================================
// Context
// ============================================
const AuthContext = createContext<AuthContextType | null>(null);

// ============================================
// Provider Component
// ============================================
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const existingSession = getCurrentSession();
        if (existingSession) {
          // Refresh session from database to ensure it's still valid
          const { data, error: refreshError } = await refreshSession();
          if (data) {
            setSession(data);
          } else {
            // Session invalid, clear it
            setSession(null);
            if (refreshError) {
              console.log('Session refresh failed:', refreshError);
            }
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = useCallback(async (code: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await loginWithAccessCode(code);

      if (loginError || !data) {
        setError(loginError || 'Login failed');
        setSession(null);
        return false;
      }

      setSession(data);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    logoutService();
    setSession(null);
    setError(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Add client access
  const addClientAccess = useCallback(async (clientId: string): Promise<boolean> => {
    const success = await addClientToUser(clientId);
    if (success) {
      // Refresh session to get updated client_ids
      const { data } = await refreshSession();
      if (data) {
        setSession(data);
      }
    }
    return success;
  }, []);

  // Computed values
  const isAuthenticated = Boolean(session?.accessCode);
  const user = session?.accessCode || null;
  const userId = getCurrentUserId();
  const userName = getCurrentUserName();
  const isAdmin = checkIsAdmin();
  const accessibleClientIds = getAccessibleClientIds();
  const isConfigured = isSupabaseConfigured();

  const value: AuthContextType = {
    session,
    isLoading,
    isAuthenticated,
    error,
    user,
    userId,
    userName,
    isAdmin,
    login,
    logout,
    clearError,
    accessibleClientIds,
    checkClientAccess: hasClientAccess,
    addClientAccess,
    isConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ============================================
// Hook
// ============================================
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================
// Higher-Order Component for Protected Routes
// ============================================
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback = null,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AuthContext;
