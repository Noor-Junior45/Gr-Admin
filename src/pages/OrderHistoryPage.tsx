import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchOrderStatusCounts, OrderStatusCounts } from '../services/orderService';
import { DeliveredOrdersPage } from './DeliveredOrdersPage';
import { CancelledOrdersPage } from './CancelledOrdersPage';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useSwipeGesture } from '../hooks/useSwipeGesture';

export interface OrderHistoryPageProps {
  defaultTab?: 'delivered' | 'cancelled';
}

export const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({ defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Resolve current active tab
  const resolveCurrentTab = useCallback((): 'delivered' | 'cancelled' => {
    if (defaultTab) return defaultTab;
    if (location.pathname === '/cancelled') return 'cancelled';
    if (location.pathname === '/delivered') return 'delivered';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'cancelled') return 'cancelled';
    return 'delivered';
  }, [defaultTab, location.pathname, searchParams]);

  const [activeTab, setActiveTab] = useState<'delivered' | 'cancelled'>(resolveCurrentTab);

  useEffect(() => {
    setActiveTab(resolveCurrentTab());
  }, [resolveCurrentTab]);

  const handleTabChange = (tab: 'delivered' | 'cancelled') => {
    setActiveTab(tab);
    if (tab === 'delivered') {
      navigate('/delivered', { replace: true });
    } else {
      navigate('/cancelled', { replace: true });
    }
  };

  // Swipe gestures to toggle between Delivered and Cancelled
  const handleSwipeLeft = useCallback(() => {
    if (activeTab === 'delivered') {
      handleTabChange('cancelled');
    }
  }, [activeTab]);

  const handleSwipeRight = useCallback(() => {
    if (activeTab === 'cancelled') {
      handleTabChange('delivered');
    }
  }, [activeTab]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    minDistance: 50,
  });

  // Real-time stage counts for minimal badges
  const [counts, setCounts] = useState<OrderStatusCounts>({
    all: 0,
    pending: 0,
    packing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });

  const loadCounts = useCallback(async () => {
    try {
      const c = await fetchOrderStatusCounts();
      setCounts(c);
    } catch (err) {
      console.warn('Failed to load status counts in history top nav:', err);
    }
  }, []);

  useEffect(() => {
    loadCounts();

    const channel = supabase
      .channel('history_top_nav_counts_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadCounts()
      )
      .subscribe();

    const interval = setInterval(loadCounts, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadCounts]);

  return (
    <div {...swipeHandlers} className="space-y-4 touch-pan-y min-h-[75vh]">
      {/* Top Navbar: 2 Minimal Buttons (1st: Delivered, 2nd: Cancelled) */}
      <div className="w-full flex items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div
          id="history-top-navbar"
          role="tablist"
          aria-label="Order history stages navigation"
          className="w-full sm:w-auto inline-flex items-center p-1 bg-slate-100/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-2xs"
        >
          {/* 1st: Delivered */}
          <button
            type="button"
            id="history-nav-btn-delivered"
            role="tab"
            aria-selected={activeTab === 'delivered'}
            onClick={() => handleTabChange('delivered')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'delivered'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Delivered and completed orders"
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'delivered' ? 'text-emerald-500' : 'text-slate-400'
              }`}
            />
            <span>Delivered</span>
            {counts.delivered > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'delivered'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.delivered}
              </span>
            )}
          </button>

          {/* 2nd: Cancelled */}
          <button
            type="button"
            id="history-nav-btn-cancelled"
            role="tab"
            aria-selected={activeTab === 'cancelled'}
            onClick={() => handleTabChange('cancelled')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer select-none ${
              activeTab === 'cancelled'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Cancelled orders and history"
          >
            <XCircle
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                activeTab === 'cancelled' ? 'text-rose-500' : 'text-slate-400'
              }`}
            />
            <span>Cancelled</span>
            {counts.cancelled > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] sm:text-xs font-mono-code font-bold ${
                  activeTab === 'cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {counts.cancelled}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Views: Delivered or Cancelled */}
      {activeTab === 'delivered' ? <DeliveredOrdersPage /> : <CancelledOrdersPage />}
    </div>
  );
};
