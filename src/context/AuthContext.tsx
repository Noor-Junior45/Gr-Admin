import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { AdminCheck } from '../types';
import { checkAdminMembership } from '../utils/adminAuth';

interface AuthContextType {
  user: any | null;
  email: string | null;
  isAdmin: boolean;
  adminCheck: AdminCheck | null;
  verificationError: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  retryAdminCheck: () => Promise<AdminCheck>;
  checkAdminStatus: () => Promise<AdminCheck>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Stale check & unmount protection
  const seqRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Performs an admin membership check via public.admin_users table.
   * Enforces race-condition protection so older async responses never overwrite newer state.
   */
  const performAdminCheck = useCallback(async (userId: string): Promise<AdminCheck> => {
    const currentSeq = ++seqRef.current;
    setLoading(true);

    const result = await checkAdminMembership(userId);

    // Stale check / unmount protection: ignore if a newer check was triggered or component unmounted
    if (!isMountedRef.current || seqRef.current !== currentSeq) {
      return result;
    }

    setAdminCheck(result);

    if (result.kind === 'admin') {
      setIsAdmin(true);
      setVerificationError(null);
      setLoading(false);
    } else if (result.kind === 'not_admin') {
      console.warn('[AuthContext] User is confirmed non-admin. Signing out.');
      setIsAdmin(false);
      setUser(null);
      setEmail(null);
      setVerificationError('This account does not have admin access.');
      setLoading(false);
      // Clean sign out on confirmed non-admin
      await supabase.auth.signOut();
    } else if (result.kind === 'error') {
      // CRITICAL: Network/DB error must NOT sign out the user and must NOT assume not_admin.
      console.warn('[AuthContext] Admin verification error (retaining session for retry):', result.message);
      setIsAdmin(false);
      setVerificationError(result.message);
      setLoading(false);
    }

    return result;
  }, []);

  const handleSession = useCallback(
    async (session: any) => {
      if (!session?.user) {
        seqRef.current++;
        setUser(null);
        setEmail(null);
        setIsAdmin(false);
        setAdminCheck(null);
        setVerificationError(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      setEmail(session.user.email ?? null);

      // Verify admin membership through public.admin_users RLS
      await performAdminCheck(session.user.id);
    },
    [performAdminCheck]
  );

  useEffect(() => {
    // 1. Initial session check on mount via getSession()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMountedRef.current) {
        handleSession(session);
      }
    });

    // 2. Listen to auth state changes: trigger helper on SIGNED_IN and TOKEN_REFRESHED events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        handleSession(session);
      } else if (event === 'SIGNED_OUT') {
        handleSession(null);
      } else if (session?.user) {
        setUser(session.user);
        setEmail(session.user.email ?? null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [handleSession]);

  /**
   * Expose retryAdminCheck to permit manual re-verification on network/DB failures
   */
  const retryAdminCheck = useCallback(async (): Promise<AdminCheck> => {
    let targetUserId = user?.id;
    if (!targetUserId) {
      const { data } = await supabase.auth.getUser();
      targetUserId = data.user?.id;
      if (data.user) {
        setUser(data.user);
        setEmail(data.user.email ?? null);
      }
    }

    if (!targetUserId) {
      setVerificationError('No active session found. Please sign in.');
      setLoading(false);
      return { kind: 'not_admin' };
    }

    return performAdminCheck(targetUserId);
  }, [user?.id, performAdminCheck]);

  const login = async (emailInput: string, passwordInput: string) => {
    try {
      setLoading(true);
      setVerificationError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: passwordInput,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message || 'Invalid login credentials' };
      }

      if (!data.user) {
        setLoading(false);
        return { success: false, error: 'User could not be authenticated.' };
      }

      setUser(data.user);
      setEmail(data.user.email ?? null);

      const checkResult = await performAdminCheck(data.user.id);

      if (checkResult.kind === 'admin') {
        return { success: true };
      }

      if (checkResult.kind === 'not_admin') {
        return {
          success: false,
          error: 'This account does not have admin access.',
        };
      }

      // kind === 'error'
      return {
        success: false,
        error: `Verification error: ${checkResult.message}. Please retry.`,
      };
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred during sign in.',
      };
    }
  };

  const sendMagicLink = async (emailInput: string) => {
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to send magic link.' };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while sending magic link.',
      };
    }
  };

  const logout = async () => {
    seqRef.current++;
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setEmail(null);
      setIsAdmin(false);
      setAdminCheck(null);
      setVerificationError(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        email,
        isAdmin,
        adminCheck,
        verificationError,
        loading,
        login,
        sendMagicLink,
        logout,
        retryAdminCheck,
        checkAdminStatus: retryAdminCheck,
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
