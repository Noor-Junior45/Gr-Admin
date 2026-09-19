import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const location = useLocation();
  const { user } = useAuth();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/dispatch') return 'Dispatch Board';
    if (path === '/delivery-partners') return 'Delivery Fleet';
    if (path === '/orders' || path === '/pending') return 'Order';
    if (path === '/packing') return 'Packing Queue';
    if (path === '/ready') return 'Ready for Rider';
    if (path === '/dispatched') return 'Out for Delivery';
    if (path === '/delivered') return 'Delivered Orders';
    if (path === '/cancelled') return 'Cancelled Orders';
    if (path === '/products') return 'Products & Stock';
    if (path === '/profile') return 'Operator Profile';
    if (path === '/settings') return 'Settings';
    if (path === '/privacy-policy') return 'Privacy Policy';
    if (path === '/terms-of-service') return 'Terms of Service';
    if (path === '/delete-account-policy') return 'Delete Account Policy';
    if (path.startsWith('/orders/')) return 'Order Details';
    return 'Warehouse Portal';
  };

  // Get first letter initial from email or fallback
  const userInitial = user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'M';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 print:hidden shadow-2xs">
      <div className="px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger + Brand / Context */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition active:scale-95 cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/"
            className="flex items-center gap-2 text-slate-900 font-bold text-base tracking-tight"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-2xs">
              <Zap className="w-4 h-4 fill-slate-950" />
            </div>
            <span className="font-bold text-base tracking-tight leading-none">Smartrun</span>
          </Link>

          {/* Desktop Breadcrumb / Title */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 min-w-0 border-l border-slate-200 pl-3 ml-1">
            <span className="text-slate-900 font-semibold truncate">{getPageTitle()}</span>
          </div>

          {/* Mobile Active Page Indicator */}
          <span className="sm:hidden text-xs text-slate-500 font-medium truncate max-w-[120px]">
            • {getPageTitle()}
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Live System Pulsating Status */}
          <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>

          {/* Redesigned Profile Circle Gmail Avatar Logo -> links to /profile */}
          <Link
            id="profile-avatar-nav-link"
            to="/profile"
            className="group relative flex items-center justify-center transition active:scale-90 cursor-pointer"
            title={user?.email ? `Account: ${user.email} (Click for Settings & Profile)` : 'Operator Profile'}
            aria-label="Operator Profile & Account Settings"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs border-2 border-white ring-2 ring-slate-200 group-hover:ring-amber-400 transition-all select-none">
              <span>{userInitial}.</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

