import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Lock,
  FileText,
  RotateCcw,
  Trash2,
  ChevronRight,
  LogOut,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, email, logout } = useAuth();

  const [avatarImgError, setAvatarImgError] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Safely determine user's display name from metadata or email (never show email as the name)
  const displayName = (() => {
    // 1. Google OAuth or Supabase metadata full_name / name
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;

    // 2. Formatted human-friendly name derived from email prefix
    const targetEmail = user?.email || email || '';
    if (!targetEmail) return 'Smartrun Operator';

    const prefix = targetEmail.split('@')[0]; // e.g. "mdnoor4860"
    const withoutNumbers = prefix.replace(/[0-9]/g, '').trim(); // e.g. "mdnoor"
    const base = withoutNumbers.length >= 2 ? withoutNumbers : prefix;

    // e.g. "john.doe" or "alex_smith"
    if (base.includes('.') || base.includes('_') || base.includes('-')) {
      return base
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }

    // e.g. "mdnoor" -> "Md Noor"
    if (base.toLowerCase().startsWith('md') && base.length > 2) {
      const rest = base.slice(2);
      return `Md ${rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase()}`;
    }

    return base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  })();

  const userEmail = user?.email || email || 'mdnoor4860@gmail.com';

  // Gmail avatar image URL if provided by Google OAuth
  const googleAvatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.photoURL ||
    null;

  // Single initial for Gmail fallback avatar
  const avatarInitial = displayName.charAt(0).toUpperCase() || 'M';

  const handleBack = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigate('/');
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (logout) {
        await logout();
      }
      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Sign out failed:', err);
      navigate('/login', { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Menu items styled to match the reference design:
  // Settings, Privacy Policy, Terms of Service, Refund Policy, Account Delete
  const menuItems = [
    {
      id: 'profile-tab-setting',
      label: 'Setting',
      path: '/settings',
      icon: Settings,
      iconBg: 'bg-cyan-100 text-cyan-700',
    },
    {
      id: 'profile-tab-privacy',
      label: 'Privacy Policy',
      path: '/privacy-policy',
      icon: Lock,
      iconBg: 'bg-teal-100 text-teal-700',
    },
    {
      id: 'profile-tab-terms',
      label: 'Terms of Service',
      path: '/terms-of-service',
      icon: FileText,
      iconBg: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'profile-tab-refund',
      label: 'Refund Policy',
      path: '/refund-policy',
      icon: RotateCcw,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'profile-tab-delete-account',
      label: 'Account Delete',
      path: '/delete-account-policy',
      icon: Trash2,
      iconBg: 'bg-rose-100 text-rose-700',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16">
      {/* Compact Top Red Header Banner with curved bottom */}
      <div
        id="profile-header-banner"
        className="bg-gradient-to-b from-[#d7000f] via-[#c4000e] to-[#a8000b] text-white rounded-b-3xl shadow-md px-4 sm:px-6 pt-3.5 pb-5 sm:pb-6 transition-all"
      >
        <div className="max-w-xl mx-auto">
          {/* Top Bar: Pill-shape Glassmorphism Back Button */}
          <div className="flex items-center justify-between mb-3 relative z-20">
            <button
              id="profile-back-btn"
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 hover:bg-white/30 active:bg-white/40 backdrop-blur-md border border-white/30 text-white text-xs font-semibold shadow-xs active:scale-95 transition cursor-pointer select-none"
              aria-label="Back to Home"
              title="Back to Home"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Back</span>
            </button>
          </div>

          {/* User Details Row: Gmail Avatar & Formatted Name */}
          <div className="flex items-center gap-3.5 sm:gap-4">
            {/* Gmail Circular Avatar */}
            <div
              id="profile-avatar-circle"
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border-2 border-white/80 shadow-md ring-2 ring-black/10 bg-[#ea4335] flex items-center justify-center select-none"
            >
              {googleAvatarUrl && !avatarImgError ? (
                <img
                  src={googleAvatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-[#d93025] to-[#f25c54] text-white font-bold text-2xl sm:text-3xl flex items-center justify-center">
                  {avatarInitial}
                </div>
              )}
            </div>

            {/* Profile Info: Name fetched from email + verified Gmail */}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white truncate leading-tight drop-shadow-2xs">
                {displayName}
              </h1>

              {/* Verified Gmail Row with Blue Checkmark */}
              <div className="flex items-center gap-1.5 mt-1 text-xs text-white/90 min-w-0">
                <span className="truncate font-mono-code text-[11px] sm:text-xs text-white/90">
                  {userEmail}
                </span>
                <span
                  title="Verified Google Account"
                  className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-blue-500 text-white shrink-0 shadow-2xs"
                >
                  <Check className="w-2 h-2 stroke-[3]" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Options Container */}
      <div className="max-w-xl mx-auto px-4 mt-5 sm:mt-6 space-y-4">
        {/* Menu Options Card */}
        <div
          id="profile-menu-card"
          className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden divide-y divide-slate-100"
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                id={item.id}
                to={item.path}
                className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-slate-50 transition active:bg-slate-100/80 cursor-pointer group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-2xs transition group-hover:scale-105`}
                  >
                    <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2.2]" />
                  </div>
                  <span className="font-semibold text-slate-800 text-sm sm:text-base tracking-tight">
                    {item.label}
                  </span>
                </div>

                <ChevronRight className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-slate-400 group-hover:text-slate-600 transition shrink-0 ml-2" />
              </Link>
            );
          })}
        </div>

        {/* Sign Out Button - Redesigned like reference image: bold solid bright red pill button */}
        <div className="pt-2">
          <button
            id="btn-profile-signout"
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full rounded-full bg-[#e50010] hover:bg-[#c9000e] text-white py-3.5 sm:py-4 px-6 font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.985] transition-all cursor-pointer select-none disabled:opacity-75"
          >
            <LogOut className="w-5 h-5 stroke-[2.4]" />
            <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
