import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { fetchOrderStatusCounts, OrderStatusCounts } from '../services/orderService';
import {
  LayoutDashboard,
  Package,
  Clock,
  Box,
  CheckCircle2,
  Bike,
  Truck,
  Sparkles,
  XCircle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();

  const [statusCounts, setStatusCounts] = useState<OrderStatusCounts>({
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
      const counts = await fetchOrderStatusCounts();
      setStatusCounts(counts);
    } catch (err) {
      console.warn('Failed to load status counts in sidebar:', err);
    }
  }, []);

  // Initial load of counts + periodic refresh
  useEffect(() => {
    loadCounts();

    // Listen to real-time order changes to immediately refresh counts
    const channel = supabase
      .channel('sidebar_order_counts_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadCounts();
        }
      )
      .subscribe();

    const interval = setInterval(loadCounts, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [loadCounts]);

  // Determine active state for order stage routes
  const isStageActive = (targetStatus?: string) => {
    const currentParams = new URLSearchParams(location.search);
    const s = currentParams.get('status');

    if (!targetStatus || targetStatus === 'all') {
      return location.pathname === '/orders' && (!s || s === 'all');
    }
    if (targetStatus === 'pending') {
      return location.pathname === '/pending' || (location.pathname === '/orders' && s === 'pending');
    }
    if (targetStatus === 'packing') {
      return location.pathname === '/packing' || (location.pathname === '/orders' && s === 'packing');
    }
    if (targetStatus === 'packed') {
      return location.pathname === '/ready' || (location.pathname === '/orders' && s === 'packed');
    }
    if (targetStatus === 'shipped') {
      return location.pathname === '/dispatched' || (location.pathname === '/orders' && s === 'shipped');
    }
    if (targetStatus === 'delivered') {
      return location.pathname === '/delivered' || (location.pathname === '/orders' && s === 'delivered');
    }
    if (targetStatus === 'cancelled') {
      return location.pathname === '/cancelled' || (location.pathname === '/orders' && s === 'cancelled');
    }
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white text-slate-900 border-r border-slate-200/80 flex flex-col justify-between transition-all duration-200 print:hidden ${
          collapsed ? 'w-18' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200/80 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <NavLink
              to="/"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 overflow-hidden group"
            >
              <div className="w-9 h-9 shrink-0 bg-amber-500 text-slate-950 font-bold flex items-center justify-center rounded-xl shadow-xs group-hover:bg-amber-400 transition">
                <Store className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-base tracking-tight text-slate-900 leading-tight truncate">
                      Smartrun
                    </span>
                  </div>
                </div>
              )}
            </NavLink>

            {/* Desktop Collapse Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Main Navigation */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-1">
                Main
              </div>
            )}

            {/* Operations Hub */}
            <NavLink
              to="/"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                  isActive && location.pathname === '/'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? 'Overview' : undefined}
            >
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 transition ${
                  location.pathname === '/' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate">Overview</span>}
            </NavLink>
          </div>

          {/* Orders Pipeline */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!collapsed && (
              <div className="flex items-center justify-between px-3 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Orders Pipeline
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-medium">
                  {statusCounts.pending}
                </span>
              </div>
            )}

            {/* Merged Pending Orders */}
            <NavLink
              to="/orders"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('all') || isStageActive('pending') || location.pathname === '/orders' || location.pathname === '/pending'
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Order (${statusCounts.pending})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('all') || isStageActive('pending') || location.pathname === '/orders' || location.pathname === '/pending'
                      ? 'text-amber-400'
                      : 'text-amber-500'
                  }`}
                />
                {!collapsed && <span className="truncate">Order</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('all') || isStageActive('pending') || location.pathname === '/orders' || location.pathname === '/pending'
                      ? 'bg-slate-800 text-amber-400'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {statusCounts.pending}
                </span>
              )}
            </NavLink>

            {/* Packing Queue */}
            <NavLink
              to="/packing"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('packing')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Packing Queue (${statusCounts.packing})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Box
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('packing') ? 'text-indigo-300' : 'text-indigo-500'
                  }`}
                />
                {!collapsed && <span className="truncate">Packing Queue</span>}
              </div>
              {!collapsed && statusCounts.packing > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    isStageActive('packing')
                      ? 'bg-slate-800 text-indigo-300'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {statusCounts.packing}
                </span>
              )}
            </NavLink>

            {/* Rider */}
            <NavLink
              to="/ready"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('packed')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Rider (${statusCounts.packed})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Bike
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('packed') ? 'text-teal-300' : 'text-teal-600'
                  }`}
                />
                {!collapsed && <span className="truncate">Rider</span>}
              </div>
              {!collapsed && statusCounts.packed > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    isStageActive('packed')
                      ? 'bg-slate-800 text-teal-300'
                      : 'bg-teal-50 text-teal-700'
                  }`}
                >
                  {statusCounts.packed}
                </span>
              )}
            </NavLink>

            {/* Out for Delivery */}
            <NavLink
              to="/dispatched"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('shipped')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Out for Delivery (${statusCounts.shipped})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Truck
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('shipped') ? 'text-sky-300' : 'text-sky-500'
                  }`}
                />
                {!collapsed && <span className="truncate">Out for Delivery</span>}
              </div>
              {!collapsed && statusCounts.shipped > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    isStageActive('shipped')
                      ? 'bg-slate-800 text-sky-300'
                      : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  {statusCounts.shipped}
                </span>
              )}
            </NavLink>

            {/* Delivered */}
            <NavLink
              to="/delivered"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('delivered')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Delivered (${statusCounts.delivered})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('delivered') ? 'text-emerald-300' : 'text-emerald-600'
                  }`}
                />
                {!collapsed && <span className="truncate">Delivered</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-semibold ${
                    isStageActive('delivered')
                      ? 'bg-slate-800 text-emerald-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusCounts.delivered}
                </span>
              )}
            </NavLink>

            {/* Cancelled */}
            <NavLink
              to="/cancelled"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('cancelled')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title={collapsed ? `Cancelled (${statusCounts.cancelled})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <XCircle
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('cancelled') ? 'text-rose-300' : 'text-rose-500'
                  }`}
                />
                {!collapsed && <span className="truncate">Cancelled</span>}
              </div>
              {!collapsed && statusCounts.cancelled > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium ${
                    isStageActive('cancelled')
                      ? 'bg-slate-800 text-rose-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusCounts.cancelled}
                </span>
              )}
            </NavLink>
          </div>
        </div>
      </aside>
    </>
  );
};
