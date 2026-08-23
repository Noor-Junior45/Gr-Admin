import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';

interface AuthContextType {
  user: any | null;
  email: string | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAdminStatus: () => Promise<{ isAdmin: boolean; isDefinitiveNonAdmin: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAdminStatus = async (): Promise<{
    isAdmin: boolean;
    isDefinitiveNonAdmin: boolean;
    error?: string;
  }> => {
    // 1. First attempt RPC `is_admin` with retry against clock skew (PGRST303)
    const { data: rpcData, error: rpcError } = await withSkewRetry(
      () => supabase.rpc('is_admin'),
      4,
      700
    );

    if (!rpcError) {
      const isConfirmedAdmin = Boolean(rpcData);
      return {
        isAdmin: isConfirmedAdmin,
        isDefinitiveNonAdmin: !isConfirmedAdmin,
      };
    }

    console.warn('RPC is_admin failed after retries, checking admin_users table:', rpcError);

    // 2. Fallback attempt: check admin_users table directly for current user
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser?.id) {
        const { data: tableData, error: tableError } = await withSkewRetry(
          () =>
            supabase
              .from('admin_users')
              .select('role')
              .eq('user_id', currentUser.id)
              .maybeSingle(),
          3,
          800
        );

        if (!tableError && tableData) {
          return { isAdmin: true, isDefinitiveNonAdmin: false };
        }
      }
    } catch (fallbackErr) {
      console.warn('Fallback admin_users check error:', fallbackErr);
    }

    return {
      isAdmin: false,
      isDefinitiveNonAdmin: false,
      error: rpcError.message || 'Unable to verify admin permissions.',
    };
  };

  const handleSession = async (session: any) => {
    if (!session?.user) {
      setUser(null);
      setEmail(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { isAdmin: isConfirmedAdmin, isDefinitiveNonAdmin } = await checkAdminStatus();

    if (isConfirmedAdmin) {
      setUser(session.user);
      setEmail(session.user.email ?? null);
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    if (isDefinitiveNonAdmin) {
      console.warn('User account definitively does not have admin permissions. Signing out.');
      await supabase.auth.signOut();
      setUser(null);
      setEmail(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    // Transient verification issue (e.g. initial token skew): do not destructively sign out yet
    setLoading(false);
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (emailInput: string, passwordInput: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      if (error) {
        return { success: false, error: error.message || 'Invalid login credentials' };
      }

      if (!data.user) {
        return { success: false, error: 'User could not be authenticated.' };
      }

      // Check admin status with skew tolerance
      const { isAdmin: isConfirmedAdmin, isDefinitiveNonAdmin, error: adminErr } =
        await checkAdminStatus();

      if (!isConfirmedAdmin) {
        if (isDefinitiveNonAdmin) {
          await supabase.auth.signOut();
          setUser(null);
          setEmail(null);
          setIsAdmin(false);
          return {
            success: false,
            error: 'This account does not have admin access.',
          };
        }

        // If there was an error verifying
        return {
          success: false,
          error: adminErr || 'Verification failed. Please try signing in again in a few seconds.',
        };
      }

      setUser(data.user);
      setEmail(data.user.email ?? null);
      setIsAdmin(true);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during sign in.',
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setEmail(null);
      setIsAdmin(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        email,
        isAdmin,
        loading,
        login,
        logout,
        checkAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
