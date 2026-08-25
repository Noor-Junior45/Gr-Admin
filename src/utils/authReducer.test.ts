import assert from 'node:assert';
import { authReducer, initialAuthState } from './authReducer';
import { AdminCheck, AuthState } from '../types';

/**
 * Test Suite: Verification that network/table errors never sign out a user
 * and never produce a "not_admin" decision.
 */
function runAuthVerificationTests() {
  console.log('--- Running Admin Verification & Auth State Tests ---');

  const dummyUser = { id: 'usr-admin-123', email: 'admin@giriraj.com' };

  // Test 1: Initial Session Loaded
  const t1 = authReducer(initialAuthState, {
    type: 'AUTH_SESSION_LOADED',
    session: { user: dummyUser },
  });
  assert.strictEqual(t1.state.user?.id, dummyUser.id, 'User must be loaded in state');
  assert.strictEqual(t1.state.loading, true, 'State should be loading while admin check is pending');
  assert.strictEqual(t1.shouldSignOut, false, 'Should not sign out on initial load');
  console.log('✓ Test 1 Passed: Initial session load initiates verification without signing out');

  // Test 2: Successful Admin Verification
  const adminResult: AdminCheck = { kind: 'admin' };
  const t2 = authReducer(t1.state, {
    type: 'ADMIN_CHECK_RESULT',
    result: adminResult,
    userId: dummyUser.id,
  });
  assert.strictEqual(t2.state.isAdmin, true, 'User must be recognized as admin');
  assert.strictEqual(t2.state.adminCheck?.kind, 'admin', 'adminCheck kind must be admin');
  assert.strictEqual(t2.state.verificationError, null, 'Error must be null');
  assert.strictEqual(t2.state.loading, false, 'Loading must be false');
  assert.strictEqual(t2.shouldSignOut, false, 'Admin must not be signed out');
  console.log('✓ Test 2 Passed: Valid membership row grants admin status');

  // Test 3: Network / Supabase / Table Error NEVER Signs Out Real Admin
  const errorResult: AdminCheck = {
    kind: 'error',
    message: 'Failed to fetch / network timeout',
  };
  const t3 = authReducer(t1.state, {
    type: 'ADMIN_CHECK_RESULT',
    result: errorResult,
    userId: dummyUser.id,
  });
  assert.strictEqual(t3.shouldSignOut, false, 'CRITICAL: Error must NEVER trigger sign out');
  assert.strictEqual(t3.state.user?.id, dummyUser.id, 'User must remain in state so they can retry');
  assert.strictEqual(t3.state.adminCheck?.kind, 'error', 'Result kind must be error, NOT not_admin');
  assert.strictEqual(t3.state.verificationError, errorResult.message, 'Error message must be preserved for UI display');
  console.log('✓ Test 3 Passed: Network/DB error keeps session intact and does NOT treat user as not_admin');

  // Test 4: Confirmed Non-Admin Triggers Sign-Out
  const notAdminResult: AdminCheck = { kind: 'not_admin' };
  const t4 = authReducer(t1.state, {
    type: 'ADMIN_CHECK_RESULT',
    result: notAdminResult,
    userId: dummyUser.id,
  });
  assert.strictEqual(t4.shouldSignOut, true, 'Confirmed non-admin must trigger sign out');
  assert.strictEqual(t4.state.user, null, 'User state must be cleared');
  assert.strictEqual(t4.state.isAdmin, false, 'isAdmin must be false');
  console.log('✓ Test 4 Passed: Confirmed non-admin triggers secure sign out');

  // Test 5: Out-of-Order / Stale Async Check Protection
  const differentUserId = 'usr-other-456';
  const t5 = authReducer(t1.state, {
    type: 'ADMIN_CHECK_RESULT',
    result: notAdminResult,
    userId: differentUserId,
  });
  assert.strictEqual(t5.shouldSignOut, false, 'Stale check for another user must not trigger sign out for current user');
  assert.strictEqual(t5.state.user?.id, dummyUser.id, 'Current user session must remain intact');
  console.log('✓ Test 5 Passed: Stale asynchronous checks for mismatched users are ignored');

  console.log('--- All 5 Admin Verification Tests Passed Successfully ---');
}

runAuthVerificationTests();
