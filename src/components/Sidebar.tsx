import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabaseClient';
import { fetchOrderStatusCounts, OrderStatusCounts } from '../services/orderService';
import {
  LayoutDashboard,
  Package,
  Clock,
  Box,
  CheckCircle2,
  Truck,
  Sparkles,
  XCircle,
  Users,
  Layers,
  Volume2,
  VolumeX,
  Radio,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  BellRing,
  RefreshCw,
  Sliders,
  Store,
  Navigation,
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
  const { email, logout } = useAuth();
  const {
    settings,
    updateSettings,
    openSettings,
    realtimeStatus,
    reconnectRealtime,
    testOrderNotification,
  } = useNotifications();
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

  const handleLogout = async () => {
    await logout();
  };

  // Determine active state for order stage routes
  const isStageActive = (targetStatus?: string) => {
    if (location.pathname !== '/orders') return false;
    const currentParams = new URLSearchParams(location.search);
    const s = currentParams.get('status');
    if (!targetStatus || targetStatus === 'all') {
      return !s || s === 'all';
    }
    return s === targetStatus;
  };

  const getRealtimeBadge = () => {
    switch (realtimeStatus) {
      case 'connected':
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono-code rounded-md"
            title="Realtime connection active"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {!collapsed && <span>Live Connected</span>}
          </div>
        );
      case 'connecting':
        return (
          <div
            className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-mono-code rounded-md"
            title="Connecting to Supabase Realtime..."
          >
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
            {!collapsed && <span>Connecting</span>}
          </div>
        );
      case 'error':
      case 'disconnected':
      default:
        return (
          <button
            type="button"
            onClick={reconnectRealtime}
            className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-mono-code rounded-md hover:bg-rose-100 transition cursor-pointer"
            title="Realtime disconnected. Click to reconnect."
          >
            <Radio className="w-3 h-3 text-rose-600" />
            {!collapsed && <span>Reconnect</span>}
          </button>
        );
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white text-slate-900 border-r border-slate-200 flex flex-col justify-between transition-all duration-200 print:hidden ${
          collapsed ? 'w-18' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand & Business Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <NavLink
              to="/"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 overflow-hidden group"
            >
              <div className="w-9 h-9 shrink-0 bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-base rounded-xl shadow-xs group-hover:bg-amber-400 transition">
                <Store className="w-5 h-5" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="font-serif-display font-bold text-base sm:text-lg tracking-tight text-slate-900 leading-tight truncate">
                    Giriraj Power
                  </span>
                  <span className="font-mono-code text-[10px] uppercase tracking-wider text-amber-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Delivery & Fulfillment
                  </span>
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
          {/* SECTION 1: OPERATIONS & DISPATCH */}
          <div className="space-y-1">
            {!collapsed && (
              <div className="text-[10px] uppercase font-mono-code tracking-widest text-slate-400 px-2.5 mb-1.5 font-semibold">
                Operations
              </div>
            )}

            {/* Operations Hub */}
            <NavLink
              to="/"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                  isActive && location.pathname === '/'
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? 'Operations Hub' : undefined}
            >
              <LayoutDashboard
                className={`w-4 h-4 shrink-0 transition ${
                  location.pathname === '/' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate">Operations Hub</span>}
            </NavLink>

            {/* Dispatch Board */}
            <NavLink
              to="/dispatch"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? 'Dispatch Board (Assign Riders)' : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Navigation
                  className={`w-4 h-4 shrink-0 transition ${
                    location.pathname.startsWith('/dispatch')
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-sky-600'
                  }`}
                />
                {!collapsed && <span className="truncate">Dispatch Board</span>}
              </div>
              {!collapsed && (statusCounts.packed > 0 || statusCounts.shipped > 0) && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    location.pathname.startsWith('/dispatch')
                      ? 'bg-sky-700 text-white'
                      : 'bg-sky-50 text-sky-700 border border-sky-200'
                  }`}
                >
                  {statusCounts.packed + statusCounts.shipped}
                </span>
              )}
            </NavLink>

            {/* Delivery Fleet / Riders */}
            <NavLink
              to="/delivery-partners"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? 'Delivery Fleet & Riders' : undefined}
            >
              <Users
                className={`w-4 h-4 shrink-0 transition ${
                  location.pathname.startsWith('/delivery-partners')
                    ? 'text-amber-400'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate">Delivery Fleet</span>}
            </NavLink>
          </div>

          {/* SECTION 2: DELIVERY PIPELINE (ORDER STAGES) */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!collapsed && (
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <span className="text-[10px] uppercase font-mono-code tracking-widest text-slate-400 font-semibold">
                  Delivery Pipeline
                </span>
                <span className="text-[10px] font-mono-code bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                  {statusCounts.all} total
                </span>
              </div>
            )}

            {/* All Orders Button */}
            <NavLink
              to="/orders"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('all')
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
              title={collapsed ? `All Orders (${statusCounts.all})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Package
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('all') ? 'text-amber-400' : 'text-slate-500'
                  }`}
                />
                {!collapsed && <span className="truncate">All Orders</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-semibold ${
                    isStageActive('all') ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusCounts.all}
                </span>
              )}
            </NavLink>

            {/* 1. Pending Stage */}
            <NavLink
              to="/orders?status=pending"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('pending')
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-amber-50/70 hover:text-amber-950'
              }`}
              title={collapsed ? `Pending Review (${statusCounts.pending})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Clock
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('pending') ? 'text-slate-950' : 'text-amber-600'
                  }`}
                />
                {!collapsed && (
                  <span className="truncate flex items-center gap-1.5">
                    <span>1. Pending Review</span>
                  </span>
                )}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('pending')
                      ? 'bg-amber-600/30 text-slate-950'
                      : statusCounts.pending > 0
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts.pending}
                </span>
              )}
            </NavLink>

            {/* 2. Packing Stage */}
            <NavLink
              to="/orders?status=packing"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('packing')
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-950'
              }`}
              title={collapsed ? `Packing Queue (${statusCounts.packing})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Box
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('packing') ? 'text-white' : 'text-indigo-600'
                  }`}
                />
                {!collapsed && <span>2. Packing Queue</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('packing')
                      ? 'bg-indigo-500 text-white'
                      : statusCounts.packing > 0
                      ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts.packing}
                </span>
              )}
            </NavLink>

            {/* 3. Ready / Packed for Rider */}
            <NavLink
              to="/orders?status=packed"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('packed')
                  ? 'bg-cyan-700 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-cyan-50/70 hover:text-cyan-950'
              }`}
              title={collapsed ? `Ready for Rider (${statusCounts.packed})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('packed') ? 'text-white' : 'text-cyan-700'
                  }`}
                />
                {!collapsed && <span>3. Ready for Rider</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('packed')
                      ? 'bg-cyan-600 text-white'
                      : statusCounts.packed > 0
                      ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts.packed}
                </span>
              )}
            </NavLink>

            {/* 4. Out for Delivery / Dispatched */}
            <NavLink
              to="/orders?status=shipped"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('shipped')
                  ? 'bg-sky-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-sky-50/70 hover:text-sky-950'
              }`}
              title={collapsed ? `Out for Delivery (${statusCounts.shipped})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Truck
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('shipped') ? 'text-white' : 'text-sky-600'
                  }`}
                />
                {!collapsed && <span>4. Out for Delivery</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('shipped')
                      ? 'bg-sky-500 text-white'
                      : statusCounts.shipped > 0
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts.shipped}
                </span>
              )}
            </NavLink>

            {/* 5. Delivered */}
            <NavLink
              to="/orders?status=delivered"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('delivered')
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-950'
              }`}
              title={collapsed ? `Delivered (${statusCounts.delivered})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('delivered') ? 'text-white' : 'text-emerald-600'
                  }`}
                />
                {!collapsed && <span>5. Delivered (POD)</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-bold ${
                    isStageActive('delivered')
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {statusCounts.delivered}
                </span>
              )}
            </NavLink>

            {/* 6. Cancelled */}
            <NavLink
              to="/orders?status=cancelled"
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                isStageActive('cancelled')
                  ? 'bg-rose-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-rose-50/70 hover:text-rose-950'
              }`}
              title={collapsed ? `Cancelled Orders (${statusCounts.cancelled})` : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <XCircle
                  className={`w-4 h-4 shrink-0 ${
                    isStageActive('cancelled') ? 'text-white' : 'text-rose-500'
                  }`}
                />
                {!collapsed && <span>Cancelled</span>}
              </div>
              {!collapsed && (
                <span
                  className={`text-[11px] font-mono-code px-2 py-0.5 rounded-md font-medium ${
                    isStageActive('cancelled')
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {statusCounts.cancelled}
                </span>
              )}
            </NavLink>
          </div>

          {/* SECTION 3: INVENTORY & STOCK */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            {!collapsed && (
              <div className="text-[10px] uppercase font-mono-code tracking-widest text-slate-400 px-2.5 mb-1.5 font-semibold">
                Store Catalog
              </div>
            )}

            <NavLink
              to="/products"
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition cursor-pointer group ${
                  isActive
                    ? 'bg-slate-900 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? 'Products & Stock' : undefined}
            >
              <Layers
                className={`w-4 h-4 shrink-0 transition ${
                  location.pathname.startsWith('/products')
                    ? 'text-amber-400'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && <span className="truncate">Products & Stock</span>}
            </NavLink>
          </div>

          {/* SECTION 4: AUDIO ALERTS & TOOLS */}
          <div className="pt-2 border-t border-slate-100 px-1 space-y-1.5">
            {!collapsed && (
              <div className="text-[10px] uppercase font-mono-code tracking-widest text-slate-400 mb-1.5 px-2 font-semibold">
                Alert Preferences
              </div>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs transition cursor-pointer ${
                settings.soundEnabled
                  ? 'text-emerald-800 bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-100/60'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
              title={settings.soundEnabled ? 'Order audio alert enabled' : 'Order audio alert muted'}
            >
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {!collapsed && (
                <span className="truncate font-medium">
                  {settings.soundEnabled ? 'Order Chime Active' : 'Chime Muted'}
                </span>
              )}
            </button>

            {/* Test Alert Sound */}
            <button
              type="button"
              onClick={testOrderNotification}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition cursor-pointer"
              title="Simulate incoming order chime"
            >
              <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
              {!collapsed && <span className="truncate font-medium">Test Order Alert</span>}
            </button>

            {/* Notification Preferences */}
            <button
              type="button"
              onClick={openSettings}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent transition cursor-pointer"
              title="Configure alert tone and sound settings"
            >
              <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
              {!collapsed && <span className="truncate font-medium">Alert Settings</span>}
            </button>
          </div>
        </div>

        {/* Footer Realtime & User Section */}
        <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/70">
          {/* Realtime Status Badge */}
          <div className="flex items-center justify-between">
            {getRealtimeBadge()}
          </div>

          {/* User Email & Logout */}
          {email && !collapsed && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="font-mono-code text-[11px] truncate">{email}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl shadow-2xs transition cursor-pointer"
            title="Sign out of warehouse portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
