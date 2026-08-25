import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const location = useLocation();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 print:hidden">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger + Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 text-slate-900 font-bold text-base tracking-tight"
          >
            <div className="w-7 h-7 rounded bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              G
            </div>
            <span className="font-serif-display font-semibold text-lg leading-none">Giriraj</span>
          </Link>

          {/* Desktop Breadcrumb context */}
          <div className="hidden lg:flex items-center gap-2 font-mono-code text-xs text-slate-500">
            <span className="uppercase text-slate-400">Portal</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold uppercase">
              {location.pathname === '/'
                ? 'Operations Hub'
                : location.pathname.startsWith('/orders/')
                ? 'Order Workspace'
                : location.pathname.startsWith('/orders')
                ? 'Order Fulfillment'
                : location.pathname.startsWith('/products')
                ? 'Inventory & Stock'
                : 'Dashboard'}
            </span>
          </div>
        </div>

        {/* Right side can remain clean or have subtle page context */}
        <div className="flex items-center gap-2">
        </div>
      </div>
    </header>
  );
};
