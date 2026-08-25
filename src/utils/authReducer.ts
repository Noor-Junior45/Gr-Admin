import { AdminCheck, AuthState } from '../types';

export type AuthAction =
  | { type: 'AUTH_SESSION_LOADED'; session: any | null }
  | { type: 'AUTH_EVENT'; event: string; session: any | null }
  | { type: 'ADMIN_CHECK_START'; userId?: string }
  | { type: 'ADMIN_CHECK_RESULT'; result: AdminCheck; userId: string }
  | { type: 'SET_VERIFICATION_ERROR'; message: string | null }
  | { type: 'LOGOUT' };

export const initialAuthState: AuthState = {
  user: null,
  email: null,
  isAdmin: false,
  adminCheck: null,
  verificationError: null,
  loading: true,
};

export interface AuthDecision {
  state: AuthState;
  shouldSignOut: boolean;
}

/**
 * Pure reducer function modeling auth state transitions and sign-out decisions.
 *
 * Rules:
 * 1. AdminCheck result with kind: 'admin' => isAdmin = true, error = null, shouldSignOut = false.
 * 2. AdminCheck result with kind: 'not_admin' => isAdmin = false, user = null, shouldSignOut = true.
 * 3. AdminCheck result with kind: 'error' => isAdmin = false, error = message, shouldSignOut = false (NEVER signs out or assumes not_admin!).
 */
export function authReducer(state: AuthState, action: AuthAction): AuthDecision {
  switch (action.type) {
    case 'AUTH_SESSION_LOADED':
    case 'AUTH_EVENT': {
      const session = action.session;
      if (!session?.user) {
        return {
          state: {
            ...state,
            user: null,
            email: null,
            isAdmin: false,
            adminCheck: null,
            verificationError: null,
            loading: false,
          },
          shouldSignOut: false,
        };
      }

      // User session exists; keep existing user data and mark loading
      return {
        state: {
          ...state,
          user: session.user,
          email: session.user.email ?? null,
          loading: true,
        },
        shouldSignOut: false,
      };
    }

    case 'ADMIN_CHECK_START': {
      return {
        state: {
          ...state,
          loading: true,
        },
        shouldSignOut: false,
      };
    }

    case 'ADMIN_CHECK_RESULT': {
      const { result, userId } = action;

      // Guard: Ignore if user has already changed
      if (state.user && state.user.id !== userId) {
        return { state, shouldSignOut: false };
      }

      if (result.kind === 'admin') {
        return {
          state: {
            ...state,
            isAdmin: true,
            adminCheck: result,
            verificationError: null,
            loading: false,
          },
          shouldSignOut: false,
        };
      }

      if (result.kind === 'not_admin') {
        return {
          state: {
            ...state,
            user: null,
            email: null,
            isAdmin: false,
            adminCheck: result,
            verificationError: 'This account does not have admin permissions.',
            loading: false,
          },
          shouldSignOut: true, // Confirmed non-admin => trigger sign out
        };
      }

      if (result.kind === 'error') {
        // Critical: Network/DB error is UNKNOWN, NOT non-admin. User is kept in session for retry.
        return {
          state: {
            ...state,
            isAdmin: false,
            adminCheck: result,
            verificationError: result.message,
            loading: false,
          },
          shouldSignOut: false, // NEVER sign out on transient error
        };
      }

      return { state, shouldSignOut: false };
    }

    case 'SET_VERIFICATION_ERROR': {
      return {
        state: {
          ...state,
          verificationError: action.message,
          loading: false,
        },
        shouldSignOut: false,
      };
    }

    case 'LOGOUT': {
      return {
        state: {
          ...state,
          user: null,
          email: null,
          isAdmin: false,
          adminCheck: null,
          verificationError: null,
          loading: false,
        },
        shouldSignOut: false,
      };
    }

    default:
      return { state, shouldSignOut: false };
  }
}
