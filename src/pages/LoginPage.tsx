import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Send,
  RotateCw,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { login, sendMagicLink, retryAdminCheck, verificationError, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  // Navigate if already verified admin
  useEffect(() => {
    if (isAdmin) {
      navigate(from, { replace: true });
    }
  }, [isAdmin, navigate, from]);

  // Sync context verification error
  useEffect(() => {
    if (verificationError) {
      setErrorMessage(verificationError);
    }
  }, [verificationError]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your staff email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await sendMagicLink(email);
      if (result.success) {
        setMagicLinkSent(true);
        setResendCooldown(60);
      } else {
        setErrorMessage(result.error || 'Failed to send magic link. Please check your email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || submitting) return;
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const result = await sendMagicLink(email);
      if (result.success) {
        setResendCooldown(60);
      } else {
        setErrorMessage(result.error || 'Failed to resend magic link.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryVerification = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await retryAdminCheck();
      if (result.kind === 'admin') {
        navigate(from, { replace: true });
      } else if (result.kind === 'not_admin') {
        setErrorMessage('This account does not have admin permissions.');
      } else {
        setErrorMessage(`Verification error: ${result.message}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to re-verify permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfdfc] text-[#1a1a18] flex flex-col font-sans antialiased selection:bg-[#1a1a18] selection:text-[#fdfdfc]">
      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
        {/* Visual Editorial Left Side */}
        <aside className="bg-[#f2efeb] border-b lg:border-b-0 lg:border-r border-[#1a1a18]/10 flex flex-col justify-between p-8 sm:p-12 lg:p-16">
          <div>
            <div className="font-serif-display text-3xl sm:text-4xl font-semibold italic text-[#1a1a18] tracking-tight">
              Giriraj.
            </div>
          </div>

          <div className="my-10 lg:my-0 space-y-4 max-w-lg">
            <h1 className="font-serif-display text-4xl sm:text-6xl lg:text-7xl font-semibold text-[#1a1a18] leading-[0.95] tracking-tight">
              Warehouse Portal
            </h1>
            <p className="text-base sm:text-lg text-[#1a1a18]/70 leading-relaxed font-normal max-w-md">
              Warehouse & packing staff portal. Sign in with password or one-click magic link.
            </p>
          </div>

          <div className="font-mono-code text-xs uppercase tracking-widest text-[#1a1a18]/40">
            REF: WMS-IND-2024
          </div>
        </aside>

        {/* Auth Interaction Right Side */}
        <section className="flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
          <div className="w-full max-w-[420px]">
            {/* Minimalist Tab Navigation */}
            {!magicLinkSent && (
              <div className="grid grid-cols-2 gap-[1px] bg-[#1a1a18]/10 border border-[#1a1a18]/10 mb-10">
                <button
                  type="button"
                  id="tab-password-access"
                  onClick={() => {
                    setAuthMode('password');
                    setErrorMessage(null);
                  }}
                  className={`p-3.5 text-center font-mono-code text-[11px] sm:text-xs uppercase tracking-wider transition cursor-pointer ${
                    authMode === 'password'
                      ? 'text-[#1a1a18] bg-[#f2efeb] font-semibold'
                      : 'text-[#1a1a18]/40 bg-[#fdfdfc] hover:text-[#1a1a18]'
                  }`}
                >
                  Password Access
                </button>
                <button
                  type="button"
                  id="tab-magic-link"
                  onClick={() => {
                    setAuthMode('magic_link');
                    setErrorMessage(null);
                  }}
                  className={`p-3.5 text-center font-mono-code text-[11px] sm:text-xs uppercase tracking-wider transition cursor-pointer ${
                    authMode === 'magic_link'
                      ? 'text-[#1a1a18] bg-[#f2efeb] font-semibold'
                      : 'text-[#1a1a18]/40 bg-[#fdfdfc] hover:text-[#1a1a18]'
                  }`}
                >
                  Magic Link
                </button>
              </div>
            )}

            {/* Error Message with Retry */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="mb-8 p-4 bg-red-50 border border-red-200 text-red-900 text-xs sm:text-sm flex flex-col gap-2.5 rounded-none animate-in fade-in"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div className="leading-snug flex-1">{errorMessage}</div>
                </div>
                {/* Show direct retry button if error is a verification failure */}
                <button
                  type="button"
                  onClick={handleRetryVerification}
                  disabled={submitting}
                  className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-900 border border-red-300 font-mono-code text-[11px] uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${submitting ? 'animate-spin' : ''}`} />
                  <span>Retry Verification</span>
                </button>
              </div>
            )}

            {/* Magic Link Sent View */}
            {magicLinkSent ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-3 border-b border-[#1a1a18]/10">
                  <CheckCircle2 className="w-6 h-6 text-emerald-700" />
                  <h3 className="font-serif-display text-2xl font-semibold text-[#1a1a18]">
                    Check Your Inbox
                  </h3>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-[#1a1a18]/70">
                    We've emailed a direct sign-in link to:
                  </p>
                  <p className="font-mono-code font-medium text-[#1a1a18] text-sm bg-[#f2efeb] py-2 px-3 border border-[#1a1a18]/10 inline-block">
                    {email}
                  </p>
                </div>

                <div className="p-4 bg-[#f2efeb] border border-[#1a1a18]/10 text-xs text-[#1a1a18]/80 leading-relaxed">
                  <p className="font-semibold text-[#1a1a18] flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#1a1a18]" />
                    Instant One-Click Login
                  </p>
                  Click the link inside the email to immediately access the warehouse portal without entering a password.
                </div>

                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || submitting}
                    className="w-full bg-[#1a1a18] text-[#fdfdfc] border border-[#1a1a18] p-4 text-xs uppercase font-mono-code tracking-wider transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-[#1a1a18]/90"
                  >
                    {submitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCw className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {resendCooldown > 0
                        ? `Resend link in ${resendCooldown}s`
                        : 'Resend Magic Link'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMagicLinkSent(false);
                      setAuthMode('password');
                    }}
                    className="w-full bg-transparent border-none text-xs text-[#1a1a18]/60 underline hover:text-[#1a1a18] transition cursor-pointer text-center py-2 flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Password Access</span>
                  </button>
                </div>
              </div>
            ) : authMode === 'password' ? (
              /* Password Access Form */
              <form onSubmit={handlePasswordSubmit}>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="staff-email-input"
                    className="font-mono-code text-[10px] sm:text-[11px] uppercase tracking-widest text-[#1a1a18]/50"
                  >
                    Staff Email
                  </label>
                </div>
                <input
                  id="staff-email-input"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@giriraj.com"
                  className="w-full py-3.5 bg-transparent border-0 border-b border-[#1a1a18]/15 text-[#1a1a18] placeholder-[#1a1a18]/30 text-base mb-8 outline-none focus:border-b-[#1a1a18] transition-colors rounded-none"
                />

                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="staff-password-input"
                    className="font-mono-code text-[10px] sm:text-[11px] uppercase tracking-widest text-[#1a1a18]/50"
                  >
                    Secret Code
                  </label>
                </div>
                <div className="relative mb-10">
                  <input
                    id="staff-password-input"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full py-3.5 pr-10 bg-transparent border-0 border-b border-[#1a1a18]/15 text-[#1a1a18] placeholder-[#1a1a18]/30 text-base outline-none focus:border-b-[#1a1a18] transition-colors rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-3.5 text-[#1a1a18]/40 hover:text-[#1a1a18] transition cursor-pointer p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  id="submit-password-login-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1a1a18] text-[#fdfdfc] border border-[#1a1a18] py-4 px-6 text-sm font-medium transition cursor-pointer hover:bg-[#1a1a18]/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mb-5 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#fdfdfc]" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Warehouse</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('magic_link');
                    setErrorMessage(null);
                  }}
                  className="w-full bg-transparent border-none text-xs text-[#1a1a18]/60 underline hover:text-[#1a1a18] transition cursor-pointer text-center"
                >
                  Forgot password? Sign in with Magic Link
                </button>
              </form>
            ) : (
              /* Magic Link Form */
              <form onSubmit={handleMagicLinkSubmit}>
                <div className="flex justify-between items-center mb-1">
                  <label
                    htmlFor="staff-magic-email"
                    className="font-mono-code text-[10px] sm:text-[11px] uppercase tracking-widest text-[#1a1a18]/50"
                  >
                    Staff Email Address
                  </label>
                </div>
                <input
                  id="staff-magic-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@giriraj.com"
                  className="w-full py-3.5 bg-transparent border-0 border-b border-[#1a1a18]/15 text-[#1a1a18] placeholder-[#1a1a18]/30 text-base mb-3 outline-none focus:border-b-[#1a1a18] transition-colors rounded-none"
                />
                <p className="text-xs text-[#1a1a18]/60 mb-10 leading-relaxed">
                  We'll dispatch a one-click login link to your inbox. No password needed.
                </p>

                <button
                  id="submit-magic-link-btn"
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#1a1a18] text-[#fdfdfc] border border-[#1a1a18] py-4 px-6 text-sm font-medium transition cursor-pointer hover:bg-[#1a1a18]/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mb-5 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#fdfdfc]" />
                      <span>Sending Link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Magic Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('password');
                    setErrorMessage(null);
                  }}
                  className="w-full bg-transparent border-none text-xs text-[#1a1a18]/60 underline hover:text-[#1a1a18] transition cursor-pointer text-center"
                >
                  Use Secret Code / Password instead
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      {/* Footer Strip */}
      <footer className="px-6 sm:px-12 py-4 border-t border-[#1a1a18]/10 flex flex-col sm:flex-row justify-between items-center gap-2 font-mono-code text-[10px] sm:text-[11px] uppercase tracking-wider text-[#1a1a18]/40 bg-[#fdfdfc]">
        <div>Internal System • Authorized Personnel Only</div>
        <div>Admin accounts provisioned in Supabase</div>
      </footer>
    </div>
  );
};
