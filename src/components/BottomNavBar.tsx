import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Clock,
  History,
  Settings,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

interface BottomNavBarProps {
  sidebarCollapsed?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ sidebarCollapsed }) => {
  const location = useLocation();
  const { newOrderCountSinceOpen } = useNotifications();

  const navItems = [
    {
      id: 'tab-orders',
      label: 'Order',
      path: '/',
      icon: Clock,
      active:
        location.pathname === '/' ||
        location.pathname === '/orders' ||
        location.pathname === '/pending' ||
        location.pathname === '/packing' ||
        location.pathname === '/ready' ||
        location.pathname.startsWith('/orders/ready') ||
        location.pathname.startsWith('/orders/packed') ||
        location.pathname === '/dispatch' ||
        location.pathname === '/dispatched',
      badge: newOrderCountSinceOpen > 0 ? `+${newOrderCountSinceOpen}` : undefined,
    },
    {
      id: 'tab-history',
      label: 'History',
      path: '/history',
      icon: History,
      active:
        location.pathname === '/history' ||
        location.pathname === '/delivered' ||
        location.pathname === '/cancelled' ||
        location.pathname.startsWith('/history'),
    },
    {
      id: 'tab-profile',
      label: 'Setting',
      path: '/profile',
      icon: Settings,
      active: location.pathname === '/profile' || location.pathname === '/settings',
    },
  ];

  return (
    <nav
      id="app-bottom-navbar"
      className={`fixed bottom-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)] print:hidden transition-all duration-200 left-0 ${
        sidebarCollapsed ? 'lg:left-18' : 'lg:left-64'
      }`}
      aria-label="Bottom Navigation"
    >
      <div className="flex items-center justify-around sm:justify-center gap-1 sm:gap-4 md:gap-8 h-15 sm:h-16 px-3 sm:px-6 max-w-lg sm:max-w-2xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.active;

          return (
            <Link
              key={item.id}
              id={item.id}
              to={item.path}
              title={item.label}
              className={`flex flex-col items-center justify-center flex-1 sm:flex-initial min-w-[56px] sm:min-w-[76px] max-w-[96px] h-full py-1 text-center transition-all duration-150 active:scale-95 relative group rounded-lg ${
                active
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50/80'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform group-hover:scale-105 ${
                    active ? 'stroke-[2.4] text-amber-600' : 'stroke-[1.8]'
                  }`}
                />

                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shadow-2xs animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] sm:text-[11px] leading-tight mt-1 tracking-tight truncate w-full px-0.5 ${
                  active ? 'font-bold text-amber-600' : 'font-medium'
                }`}
              >
                {item.label}
              </span>

              {/* Active subtle pill bar indicator */}
              {active && (
                <span className="absolute bottom-1 w-5 sm:w-6 h-0.5 rounded-full bg-amber-500" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
