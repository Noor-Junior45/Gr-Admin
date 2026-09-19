import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { OrderDashboardStats } from '../types';
import { fetchDashboardStats } from '../services/orderService';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency } from '../utils/formatters';
import {
  Package,
  IndianRupee,
  Clock,
  Box,
  Truck,
  Sparkles,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Timer,
  CheckCircle2,
  Percent,
  Activity,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { resetNewOrderCount } = useNotifications();

  const [stats, setStats] = useState<OrderDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardMetrics = async () => {
    setLoading(true);
    setError(null);

    try {
      const statsData = await fetchDashboardStats();
      setStats(statsData);
      resetNewOrderCount();
    } catch (err: any) {
      console.error('Failed to load dashboard metrics:', err);
      setError(err.message || 'Failed to fetch operations metrics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardMetrics();

    // Listen to realtime changes on orders to keep metrics live
    const channel = supabase
      .channel('dashboard_metrics_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadDashboardMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Computed Derived Operational Metrics
  const totalOrders = stats?.totalOrders ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const todayOrders = stats?.todayOrders ?? 0;
  const todayRevenue = stats?.todayRevenue ?? 0;
  const pendingOrders = stats?.pendingOrders ?? 0;
  const packingOrders = stats?.packingOrders ?? 0;
  const shippedOrders = stats?.shippedOrders ?? 0;
  const deliveredOrders = stats?.deliveredOrders ?? 0;
  const cancelledOrders = stats?.cancelledOrders ?? 0;

  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const activeOrders = pendingOrders + packingOrders + shippedOrders;
  const fulfillmentRate = totalOrders > 0 ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : '0.0';
  const cancellationRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : '0.0';
  const activePipelineRate = totalOrders > 0 ? ((activeOrders / totalOrders) * 100).toFixed(1) : '0.0';

  const avgPackingMins = Math.round(stats?.avgPackingDelayMinutes ?? 0);
  const avgDeliveryMins = Math.round(stats?.avgDeliveryMinutes ?? 0);

  return (
    <div className="space-y-3.5 sm:space-y-6 pb-12 sm:pb-6">
      {error && (
        <div className="p-3 sm:p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold">Metrics Sync Error: </span>
            {error}
          </div>
          <button
            onClick={loadDashboardMetrics}
            className="text-xs font-semibold underline text-rose-900 hover:text-rose-700 cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Row 1: High-Level Financial & Volume KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Orders Metric Card */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Total Orders</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-8 w-16 sm:w-20 bg-slate-200 animate-pulse rounded-md" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono-code text-slate-900 truncate">
                {totalOrders.toLocaleString()}
              </div>
            )}
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono-code truncate">
              <span className="text-slate-400">Today:</span>
              <span className="font-bold text-slate-700">+{todayOrders}</span>
              <span className="text-slate-400 hidden xs:inline">orders</span>
            </div>
          </div>
        </div>

        {/* Total Revenue Metric Card */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Total Revenue</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-8 w-20 sm:w-28 bg-slate-200 animate-pulse rounded-md" />
            ) : (
              <div
                className="text-base sm:text-2xl lg:text-3xl font-bold font-mono-code text-slate-900 truncate"
                title={formatCurrency(totalRevenue)}
              >
                {formatCurrency(totalRevenue)}
              </div>
            )}
            <div className="text-[10px] sm:text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-mono-code truncate">
              <span className="text-slate-400">Today:</span>
              <span className="font-semibold">{formatCurrency(todayRevenue)}</span>
            </div>
          </div>
        </div>

        {/* Average Order Value (AOV) Metric Card */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Avg Order Value</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-8 w-16 sm:w-20 bg-slate-200 animate-pulse rounded-md" />
            ) : (
              <div
                className="text-base sm:text-2xl lg:text-3xl font-bold font-mono-code text-slate-900 truncate"
                title={formatCurrency(avgOrderValue)}
              >
                {formatCurrency(avgOrderValue)}
              </div>
            )}
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono-code truncate">
              <span className="text-slate-400">Rate:</span>
              <span className="font-medium text-slate-700">
                {totalOrders > 0 ? `${(totalOrders / Math.max(1, Math.ceil(totalOrders / 30))).toFixed(1)}/day` : '0/day'}
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Completion Rate Metric Card */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Fulfillment Rate</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            {loading ? (
              <div className="h-7 sm:h-8 w-14 sm:w-16 bg-slate-200 animate-pulse rounded-md" />
            ) : (
              <div className="text-xl sm:text-3xl font-bold font-mono-code text-emerald-600 truncate">
                {fulfillmentRate}%
              </div>
            )}
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono-code truncate">
              <span className="font-semibold text-emerald-700">{deliveredOrders}</span>
              <span className="text-slate-400">of</span>
              <span className="font-semibold text-slate-700">{totalOrders}</span>
              <span className="text-slate-400 hidden xs:inline">done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Status Breakdown & Pipeline Distribution Metrics */}
      <div className="bg-white p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>Order Fulfillment Stage Metrics</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Breakdown of total order inventory across all fulfillment phases.
            </p>
          </div>
          <div className="text-[11px] sm:text-xs font-mono-code text-slate-500">
            Active in Pipeline: <span className="font-bold text-slate-800">{activeOrders} orders</span> ({activePipelineRate}%)
          </div>
        </div>

        {/* 5 Stage Metric Cards: 2 cols on mobile, 5 cols on lg */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {/* Pending */}
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/50 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono-code font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">
                {totalOrders > 0 ? `${((pendingOrders / totalOrders) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-amber-900">{pendingOrders}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-amber-800 mt-0.5 truncate">Pending Action</div>
            </div>
          </div>

          {/* Packing */}
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-indigo-200/80 bg-indigo-50/50 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono-code font-bold text-indigo-800 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                {totalOrders > 0 ? `${((packingOrders / totalOrders) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-indigo-900">{packingOrders}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-indigo-800 mt-0.5 truncate">Packing Queue</div>
            </div>
          </div>

          {/* Out for Delivery */}
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono-code font-bold text-blue-800 bg-blue-100/70 px-1.5 py-0.5 rounded">
                {totalOrders > 0 ? `${((shippedOrders / totalOrders) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-blue-900">{shippedOrders}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-blue-800 mt-0.5 truncate">Out for Delivery</div>
            </div>
          </div>

          {/* Delivered */}
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 flex flex-col justify-between min-w-0">
            <div className="flex items-center justify-between gap-1">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono-code font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                {totalOrders > 0 ? `${((deliveredOrders / totalOrders) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-emerald-900">{deliveredOrders}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-emerald-800 mt-0.5 truncate">Delivered</div>
            </div>
          </div>

          {/* Cancelled: on phone screen spans 2 columns neatly */}
          <div className="p-2.5 sm:p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/50 flex flex-col justify-between col-span-2 sm:col-span-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
              <span className="text-[10px] sm:text-[11px] font-mono-code font-bold text-rose-800 bg-rose-100/70 px-1.5 py-0.5 rounded">
                {totalOrders > 0 ? `${((cancelledOrders / totalOrders) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="mt-2 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-rose-900">{cancelledOrders}</div>
              <div className="text-[11px] sm:text-xs font-semibold text-rose-800 mt-0.5 truncate">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Visual Stacked Progress Distribution Bar */}
        <div className="pt-1">
          <div className="text-[10px] sm:text-[11px] font-medium text-slate-500 mb-1.5 flex items-center justify-between">
            <span>Visual Pipeline Volume Ratio</span>
            <span className="font-mono-code">{totalOrders} Orders Total</span>
          </div>
          <div className="h-2.5 sm:h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{
                width: `${totalOrders ? (pendingOrders / totalOrders) * 100 : 0}%`,
              }}
              className="bg-amber-500 transition-all duration-500"
              title={`Pending: ${pendingOrders} (${totalOrders ? ((pendingOrders / totalOrders) * 100).toFixed(1) : 0}%)`}
            />
            <div
              style={{
                width: `${totalOrders ? (packingOrders / totalOrders) * 100 : 0}%`,
              }}
              className="bg-indigo-500 transition-all duration-500"
              title={`Packing: ${packingOrders} (${totalOrders ? ((packingOrders / totalOrders) * 100).toFixed(1) : 0}%)`}
            />
            <div
              style={{
                width: `${totalOrders ? (shippedOrders / totalOrders) * 100 : 0}%`,
              }}
              className="bg-blue-500 transition-all duration-500"
              title={`Out for Delivery: ${shippedOrders} (${totalOrders ? ((shippedOrders / totalOrders) * 100).toFixed(1) : 0}%)`}
            />
            <div
              style={{
                width: `${totalOrders ? (deliveredOrders / totalOrders) * 100 : 0}%`,
              }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Delivered: ${deliveredOrders} (${totalOrders ? ((deliveredOrders / totalOrders) * 100).toFixed(1) : 0}%)`}
            />
            <div
              style={{
                width: `${totalOrders ? (cancelledOrders / totalOrders) * 100 : 0}%`,
              }}
              className="bg-rose-400 transition-all duration-500"
              title={`Cancelled: ${cancelledOrders} (${totalOrders ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0}%)`}
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-[10px] sm:text-[11px] text-slate-600">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">Pending ({pendingOrders})</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">Packing ({packingOrders})</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
              <span className="truncate">Out for Delivery ({shippedOrders})</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Delivered ({deliveredOrders})</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span className="truncate">Cancelled ({cancelledOrders})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Operational Efficiency & Speed Metrics (2x2 grid on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Packing Speed Metric */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Avg Packing Time</span>
            <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-2.5">
            <div className="text-lg sm:text-2xl font-bold font-mono-code text-slate-900 truncate">
              {avgPackingMins > 0 ? `${avgPackingMins} min` : '< 15 min'}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 line-clamp-2">
              From confirmation to packing completion.
            </p>
          </div>
        </div>

        {/* Dispatch to Delivery Speed Metric */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Avg Delivery Transit</span>
            <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-2.5">
            <div className="text-lg sm:text-2xl font-bold font-mono-code text-slate-900 truncate">
              {avgDeliveryMins > 0 ? `${avgDeliveryMins} min` : 'Same-day'}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 line-clamp-2">
              Transit window to recipient doorstep.
            </p>
          </div>
        </div>

        {/* Active Pipeline Load Ratio */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Active Load Ratio</span>
            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-2.5">
            <div className="text-lg sm:text-2xl font-bold font-mono-code text-slate-900 truncate">
              {activePipelineRate}%
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 line-clamp-2">
              {activeOrders} active packages in fulfillment.
            </p>
          </div>
        </div>

        {/* Cancellation Ratio Metric */}
        <div className="bg-white p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-[11px] sm:text-xs font-medium gap-1">
            <span className="truncate">Cancellation Rate</span>
            <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
          </div>
          <div className="mt-2 sm:mt-2.5">
            <div className="text-lg sm:text-2xl font-bold font-mono-code text-rose-600 truncate">
              {cancellationRate}%
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 line-clamp-2">
              {cancelledOrders} cancelled or recalled orders.
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Top Products Sales Volume & Revenue Metrics (Pure Analytics Table) */}
      {stats?.topProducts && stats.topProducts.length > 0 && (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Top selling</span>
            </h2>
            <span className="text-[10px] sm:text-xs font-mono-code text-slate-400 shrink-0">
              {stats.topProducts.length} logged
            </span>
          </div>

          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 text-[10px] sm:text-[11px] font-mono-code uppercase border-b border-slate-100">
                <tr>
                  <th className="w-[42%] py-2 sm:py-2.5 pl-3 pr-1 sm:px-4 font-semibold truncate">Product Name</th>
                  <th className="w-[16%] py-2 sm:py-2.5 px-1 sm:px-2 text-center font-semibold truncate">Unit</th>
                  <th className="w-[26%] py-2 sm:py-2.5 px-1 sm:px-2 text-right font-semibold truncate">Revenue</th>
                  <th className="w-[16%] py-2 sm:py-2.5 pl-1 pr-3 sm:px-4 text-right font-semibold truncate">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {stats.topProducts.map((prod, idx) => {
                  const revShare = totalRevenue > 0 ? ((prod.revenue / totalRevenue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 pl-3 pr-1 sm:px-4 font-medium text-slate-900 truncate">
                        <span className="font-semibold block truncate" title={prod.name}>
                          {prod.name}
                        </span>
                      </td>
                      <td className="py-2.5 px-1 sm:px-2 text-center font-mono-code text-[11px] sm:text-xs font-bold text-slate-700 truncate">
                        {prod.quantity}
                      </td>
                      <td className="py-2.5 px-1 sm:px-2 text-right font-mono-code text-[11px] sm:text-xs font-bold text-emerald-700 truncate">
                        {formatCurrency(prod.revenue)}
                      </td>
                      <td className="py-2.5 pl-1 pr-3 sm:px-4 text-right font-mono-code text-[10px] sm:text-xs text-slate-500 truncate">
                        {revShare}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
