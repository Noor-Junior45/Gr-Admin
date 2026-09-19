import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Box,
  Bike,
  Truck,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

export const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const { newOrderCountSinceOpen } = useNotifications();

  const navItems = [
    {
      id: 'tab-overview',
      label: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      active: location.pathname === '/',
    },
    {
      id: 'tab-orders',
      label: 'Order',
      path: '/orders',
      icon: Clock,
      active: location.pathname === '/orders' || location.pathname === '/pending',
      badge: newOrderCountSinceOpen > 0 ? `+${newOrderCountSinceOpen}` : undefined,
    },
    {
      id: 'tab-packing',
      label: 'Packing',
      path: '/packing',
      icon: Box,
      active: location.pathname === '/packing',
    },
    {
      id: 'tab-ready',
      label: 'Rider',
      path: '/ready',
      icon: Bike,
      active:
        location.pathname === '/ready' ||
        location.pathname.startsWith('/orders/ready') ||
        location.pathname.startsWith('/orders/packed'),
    },
    {
      id: 'tab-dispatch',
      label: 'Dispatch',
      path: '/dispatch',
      icon: Truck,
      active: location.pathname === '/dispatch',
    },
  ];

  return (
    <nav
      id="phone-app-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] print:hidden"
    >
      <div className="flex items-center justify-around h-14 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.active;

          return (
            <Link
              key={item.id}
              id={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-transform active:scale-90 relative ${
                active ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {item.badge && (
                  <span className="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 shadow-2xs animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] leading-tight mt-1 tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
