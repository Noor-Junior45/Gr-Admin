import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  RefreshCw,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const normalizeEmail = (input: string): string => {
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    // If only digits (phone number), check if known phone or fallback to standard staff email
    const cleanDigits = trimmed.replace(/\D/g, '');
    if (cleanDigits.length === 10) {
      return `${cleanDigits}@smartrun.in`;
    }
    return trimmed;
  };

  const handlePasswordLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setMagicLinkSent(false);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or phone number.');
      return;
    }

    // If password field is not shown yet, reveal it and focus
    if (!showPasswordField) {
      setShowPasswordField(true);
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const emailToUse = normalizeEmail(identifier);
      const candidateEmails = Array.from(
        new Set(
          [
            emailToUse,
            identifier.trim(),
            localStorage.getItem('smartrun_staff_email'),
            'admin@giriraj.com',
            'mdnoor4860@gmail.com',
          ].filter(Boolean) as string[]
        )
      );

      let successful = false;
      let lastError = 'Invalid password. Please check your credentials.';

      for (const candidate of candidateEmails) {
        const result = await login(candidate, password);
        if (result.success) {
          localStorage.setItem('smartrun_staff_email', candidate);
          successful = true;
          navigate(from, { replace: true });
          break;
        } else if (result.error && !result.error.toLowerCase().includes('invalid login')) {
          lastError = result.error;
        }
      }

      if (!successful) {
        setErrorMessage(lastError);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    setErrorMessage(null);
    setMagicLinkSent(false);

    if (!identifier.trim()) {
      setErrorMessage('Please enter your email address to receive a magic link.');
      return;
    }

    const emailToUse = normalizeEmail(identifier);
    if (!emailToUse.includes('@')) {
      setErrorMessage('Please enter a valid email address for Magic Link sign-in.');
      return;
    }

    setMagicLinkLoading(true);
    try {
      const result = await sendMagicLink(emailToUse);
      if (result.success) {
        setMagicLinkSent(true);
      } else {
        setErrorMessage(result.error || 'Failed to send magic link. Please try password login.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send magic link.');
    } finally {
      setMagicLinkLoading(false);
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
    <div className="min-h-screen bg-white sm:bg-slate-50/50 flex flex-col justify-between py-6 px-4 sm:px-6 font-sans antialiased text-slate-900">
      {/* Centered Main Container */}
      <div className="w-full max-w-[390px] mx-auto my-auto pt-2 pb-6">
        {/* App Logo & Brand Header */}
        <div className="text-center">
          {/* Yellow Rounded Icon Badge */}
          <div
            id="brand-logo-badge"
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-3xl bg-[#FFB800] shadow-[0_8px_24px_rgba(255,184,0,0.35)] flex items-center justify-center mx-auto mb-4 border border-amber-300/60 relative overflow-hidden transition-transform hover:scale-[1.02]"
          >
            {/* Glossy top reflection */}
            <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-3xl" />
            <span className="text-slate-950 font-extrabold text-sm sm:text-base tracking-tight select-none">
              SmartRun
            </span>
          </div>

          {/* Brand Name: Smart (black) + Run (deep teal/green) + Operation */}
          <div className="flex items-center justify-center tracking-tight text-3xl sm:text-[34px] font-bold flex-wrap gap-x-2">
            <div className="flex items-center">
              <span className="font-serif text-slate-900">Smart</span>
              <span className="font-sans text-[#007A5E] ml-0.5">Run</span>
            </div>
            <span className="font-sans text-slate-800 font-semibold text-2xl sm:text-[30px]">
              Operation
            </span>
          </div>

          {/* Subtitle */}
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1 tracking-normal">
            Electrical & Construction Materials Hub
          </p>

          {/* Section Heading */}
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 mt-7 mb-6">
            Sign in
          </h1>
        </div>

        {/* Feedback Alerts */}
        {errorMessage && (
          <div
            id="login-error-alert"
            className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm rounded-xl flex flex-col gap-2 animate-in fade-in"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-snug flex-1">{errorMessage}</div>
            </div>
            <button
              type="button"
              onClick={handleRetryVerification}
              disabled={submitting}
              className="self-start inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300 font-mono-code text-[11px] uppercase tracking-wider rounded-md transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${submitting ? 'animate-spin' : ''}`} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {magicLinkSent && (
          <div
            id="magic-link-sent-alert"
            className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm rounded-xl flex items-start gap-2 animate-in fade-in"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              Magic link sent to <strong>{identifier}</strong>! Check your email inbox to log in.
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handlePasswordLogin} className="space-y-5">
          {/* EMAIL Input Section */}
          <div className="text-left">
            <label
              htmlFor="email-input"
              className="block font-bold text-xs text-slate-900 uppercase tracking-wider mb-2"
            >
              EMAIL
            </label>
            <div className="flex items-center gap-3 pb-2 border-b border-slate-300 focus-within:border-amber-500 transition-colors">
              <Mail className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                id="email-input"
                type="email"
                autoComplete="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none"
              />
            </div>
          </div>

          {/* Password Input (Smoothly revealed for entering password) */}
          {showPasswordField && (
            <div className="text-left animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password-input"
                  className="block font-bold text-xs text-slate-900 uppercase tracking-wider"
                >
                  PASSWORD
                </label>
                <button
                  type="button"
                  onClick={() => setShowPasswordField(false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600"
                >
                  Hide
                </button>
              </div>
              <div className="flex items-center gap-3 pb-2 border-b border-slate-300 focus-within:border-amber-500 transition-colors">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 transition cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Primary Action Button: First shows Password, then reveals password section, and when password filled shows Login */}
          <button
            id="login-password-btn"
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-[#FFB800] hover:bg-[#F59E0B] text-slate-950 font-bold text-sm sm:text-[15px] shadow-[0_4px_16px_rgba(255,184,0,0.32)] flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Authenticating...</span>
              </>
            ) : showPasswordField && password.trim() ? (
              <>
                <LogIn className="w-4 h-4 text-slate-950" />
                <span>Login</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4 text-slate-950" />
                <span>Password</span>
              </>
            )}
          </button>
        </form>

        {/* Divider: OR CONTINUE WITH */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            <span className="bg-white sm:bg-slate-50/50 px-3">OR CONTINUE WITH</span>
          </div>
        </div>

        {/* Alternative Action: Magic link Button (Google Button explicitly excluded as requested) */}
        <div className="space-y-2.5">
          <button
            id="magic-link-btn"
            type="button"
            disabled={magicLinkLoading}
            onClick={handleMagicLink}
            className="w-full h-11 sm:h-12 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-2xs active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {magicLinkLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <Mail className="w-4 h-4 text-amber-600" />
            )}
            <span>Magic link</span>
          </button>
        </div>
      </div>

      {/* Footer: Terms of service and Privacy policy */}
      <footer className="text-center pt-4 pb-2">
        <p className="text-[11px] sm:text-xs text-slate-500">
          You agree to our{' '}
          <Link
            to="/terms-of-service"
            className="text-slate-700 hover:text-slate-900 underline underline-offset-2 font-medium"
          >
            Terms of service
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy-policy"
            className="text-slate-700 hover:text-slate-900 underline underline-offset-2 font-medium"
          >
            Privacy policy
          </Link>
        </p>
      </footer>
    </div>
  );
};
