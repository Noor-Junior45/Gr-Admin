import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from './supabaseHelper';
import type { AdminCheck } from '../types';

export type { AdminCheck };

/**
 * Checks if an authenticated user is an administrator via public.admin_users table.
 *
 * Database authorization contract:
 * - Authenticated users can SELECT only their own public.admin_users row (RLS).
 * - A successful query that returns a row => { kind: 'admin' }
 * - A successful query that returns no row => { kind: 'not_admin' }
 * - A Supabase/network error => { kind: 'error', message: string } (NEVER non-admin)
 * - RLS, not React state, is the authorization boundary.
 */
export async function checkAdminMembership(userId: string): Promise<AdminCheck> {
  if (!userId) {
    return { kind: 'not_admin' };
  }

  try {
    const { data, error } = await withSkewRetry(
      () =>
        supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle(),
      3,
      600
    );

    if (error) {
      console.warn('[AdminCheck] Database/RLS error while verifying admin membership:', error.message);
      return { kind: 'error', message: error.message || 'Verification error' };
    }

    return data ? { kind: 'admin' } : { kind: 'not_admin' };
  } catch (err: any) {
    console.warn('[AdminCheck] Network exception while verifying admin membership:', err);
    return {
      kind: 'error',
      message: err?.message || 'Network error occurred while verifying admin access.',
    };
  }
}
