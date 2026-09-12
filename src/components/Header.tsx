import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Store } from 'lucide-react';

interface HeaderProps {
  onOpenMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileNav }) => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview';
    if (path === '/dispatch') return 'Dispatch Board';
    if (path === '/delivery-partners') return 'Delivery Fleet';
    if (path === '/orders') return 'All Orders';
    if (path === '/pending') return 'Pending Orders';
    if (path === '/packing') return 'Packing Queue';
    if (path === '/ready') return 'Ready for Rider';
    if (path === '/dispatched') return 'Out for Delivery';
    if (path === '/delivered') return 'Delivered Orders';
    if (path === '/cancelled') return 'Cancelled Orders';
    if (path === '/products') return 'Products & Stock';
    if (path.startsWith('/orders/')) return 'Order Details';
    return 'Warehouse Portal';
  };

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 print:hidden shadow-2xs">
      <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger + Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link
            to="/"
            className="lg:hidden flex items-center gap-2 text-slate-900 font-bold text-base tracking-tight"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm">
              <Store className="w-4 h-4" />
            </div>
            <span className="font-bold text-base leading-none">Smartrun</span>
          </Link>

          {/* Page context indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="text-slate-400 font-medium">Smartrun</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold truncate">{getPageTitle()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
