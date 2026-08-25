import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderDashboardStats, Product } from '../types';
import { fetchDashboardStats, fetchOrdersList } from '../services/orderService';
import { fetchLowStockProducts } from '../services/productService';
import { useNotifications } from '../context/NotificationContext';
import {
  formatCurrency,
  formatDateTime,
  formatShortId,
  getStatusConfig,
  getPaymentBadge,
} from '../utils/formatters';
import {
  LayoutDashboard,
  Clock,
  Box,
  Truck,
  Sparkles,
  XCircle,
  IndianRupee,
  Package,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Layers,
  ShoppingBag,
  BellRing,
  ExternalLink,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { newOrderCountSinceOpen, resetNewOrderCount, lastSyncTime } = useNotifications();

  const [stats, setStats] = useState<OrderDashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [statsData, ordersResult, stockProducts] = await Promise.all([
        fetchDashboardStats(),
        fetchOrdersList({ page: 1, pageSize: 6, sortBy: 'placed_at_desc' }),
        fetchLowStockProducts(20),
      ]);

      setStats(statsData);
      setRecentOrders(ordersResult.orders);
      setLowStockProducts(stockProducts);
      resetNewOrderCount();
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to fetch operations dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen to realtime changes on orders to refresh counts
    const channel = supabase
      .channel('dashboard_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          loadDashboardData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Operations Overview
            </h1>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono-code px-2 py-0.5 rounded font-medium">
              Live Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time warehouse order fulfillment, packing queues, and stock alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {newOrderCountSinceOpen > 0 && (
            <button
              type="button"
              onClick={() => loadDashboardData(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-semibold rounded-lg hover:bg-amber-400 transition animate-pulse cursor-pointer shadow-xs"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{newOrderCountSinceOpen} new order(s) arrived</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition cursor-pointer border border-slate-200 active:scale-95 disabled:opacity-60"
            title="Refresh operational statistics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-lg flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Unable to fetch some dashboard metrics: </span>
            {error}
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            className="text-xs font-semibold underline text-rose-900 hover:text-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Orders Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-16 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-slate-900">
                {stats?.totalOrders ?? 0}
              </div>
            )}
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono-code">
              <span>Today:</span>
              <span className="font-bold text-slate-700">{stats?.todayOrders ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Total Revenue Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-24 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-xl sm:text-2xl font-bold font-mono-code text-slate-900 truncate">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </div>
            )}
            <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1 font-mono-code">
              <span>Today:</span>
              <span className="font-semibold">{formatCurrency(stats?.todayRevenue ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Pending Orders Card */}
        <Link
          to="/orders?status=pending"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-amber-700 text-xs font-medium">
            <span>Pending Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-14 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-amber-600">
                {stats?.pendingOrders ?? 0}
              </div>
            )}
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Needs confirmation</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition" />
            </div>
          </div>
        </Link>

        {/* Packing Queue Card */}
        <Link
          to="/orders?status=packing"
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-400 hover:shadow-sm transition group"
        >
          <div className="flex items-center justify-between text-indigo-700 text-xs font-medium">
            <span>Packing Queue</span>
            <Box className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-8 w-14 bg-slate-200 animate-pulse rounded"></div>
            ) : (
              <div className="text-2xl sm:text-3xl font-bold font-mono-code text-indigo-600">
                {stats?.packingOrders ?? 0}
              </div>
            )}
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Ready to package</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition" />
            </div>
          </div>
        </Link>
      </div>

      {/* Status Workflow Progress / Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution Visual */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Fulfillment Workflow Distribution</span>
              </h2>
              <Link
                to="/orders"
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live distribution of orders across each workflow milestone.
            </p>

            {/* Visual Workflow Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4">
              {[
                { status: 'pending', label: 'Pending', count: stats?.pendingOrders ?? 0, icon: Clock, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                { status: 'packing', label: 'Packing', count: stats?.packingOrders ?? 0, icon: Box, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
                { status: 'shipped', label: 'Out for Delivery', count: stats?.shippedOrders ?? 0, icon: Truck, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                { status: 'delivered', label: 'Delivered', count: stats?.deliveredOrders ?? 0, icon: Sparkles, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                { status: 'cancelled', label: 'Cancelled', count: stats?.cancelledOrders ?? 0, icon: XCircle, color: 'text-rose-700 bg-rose-50 border-rose-200' },
              ].map((step) => {
                const Icon = step.icon;
                return (
                  <Link
                    key={step.status}
                    to={`/orders?status=${step.status}`}
                    className={`p-3 rounded-lg border flex flex-col justify-between transition hover:shadow-xs ${step.color}`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 opacity-80" />
                      <span className="text-lg font-bold font-mono-code">{step.count}</span>
                    </div>
                    <div className="text-[11px] font-semibold mt-2 truncate">{step.label}</div>
                  </Link>
                );
              })}
            </div>

            {/* Visual Stacked Progress Bar */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-medium text-slate-600 mb-1.5 flex justify-between">
                <span>Active Pipeline Share</span>
                <span className="font-mono-code text-slate-500">
                  {stats?.totalOrders ? `${stats.totalOrders} total recorded` : '0 orders'}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{
                    width: `${stats?.totalOrders ? ((stats.pendingOrders || 0) / stats.totalOrders) * 100 : 0}%`,
                  }}
                  className="bg-amber-500"
                  title={`Pending: ${stats?.pendingOrders || 0}`}
                />
                <div
                  style={{
                    width: `${stats?.totalOrders ? ((stats.packingOrders || 0) / stats.totalOrders) * 100 : 0}%`,
                  }}
                  className="bg-indigo-500"
                  title={`Packing: ${stats?.packingOrders || 0}`}
                />
                <div
                  style={{
                    width: `${stats?.totalOrders ? ((stats.shippedOrders || 0) / stats.totalOrders) * 100 : 0}%`,
                  }}
                  className="bg-blue-500"
                  title={`Out for Delivery: ${stats?.shippedOrders || 0}`}
                />
                <div
                  style={{
                    width: `${stats?.totalOrders ? ((stats.deliveredOrders || 0) / stats.totalOrders) * 100 : 0}%`,
                  }}
                  className="bg-emerald-500"
                  title={`Delivered: ${stats?.deliveredOrders || 0}`}
                />
                <div
                  style={{
                    width: `${stats?.totalOrders ? ((stats.cancelledOrders || 0) / stats.totalOrders) * 100 : 0}%`,
                  }}
                  className="bg-rose-400"
                  title={`Cancelled: ${stats?.cancelledOrders || 0}`}
                />
              </div>
            </div>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 mr-1">Quick Queues:</span>
            <Link
              to="/orders?status=packing"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-md border border-slate-200 flex items-center gap-1.5 transition"
            >
              <Box className="w-3.5 h-3.5 text-indigo-600" />
              <span>Packing Queue</span>
            </Link>
            <Link
              to="/orders?status=shipped"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-md border border-slate-200 flex items-center gap-1.5 transition"
            >
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>Out for Delivery</span>
            </Link>
            <Link
              to="/products"
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-md border border-slate-200 flex items-center gap-1.5 transition"
            >
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Stock Catalog</span>
            </Link>
          </div>
        </div>

        {/* Low Stock / Inventory Alerts Panel */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Inventory & Stock</span>
              </h2>
              <Link
                to="/products"
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                All Products <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live status from the verified <code className="font-mono-code bg-slate-100 px-1 py-0.5 rounded text-[11px]">products</code> table.
            </p>

            {/* List of low stock products */}
            <div className="mt-3 divide-y divide-slate-100 max-h-[260px] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 py-2">
                  <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
                  <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
                </div>
              ) : lowStockProducts.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-medium text-slate-700">Healthy Stock Levels</p>
                  <p className="text-[11px] text-slate-400">All products have sufficient units on hand.</p>
                </div>
              ) : (
                lowStockProducts.map((p) => {
                  const isOut = (p.stock_quantity ?? 0) <= 0 || p.in_stock === false;
                  return (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image_urls && p.image_urls[0] ? (
                          <img
                            src={p.image_urls[0]}
                            alt={p.name}
                            className="w-9 h-9 object-contain bg-slate-50 border border-slate-200 rounded shrink-0 p-0.5"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded flex items-center justify-center shrink-0">
                            <Box className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate" title={p.name}>
                            {p.name}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {p.brand ? `${p.brand} • ` : ''}
                            {formatCurrency(p.price)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded border ${
                            isOut
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isOut ? 'OUT OF STOCK' : `${p.stock_quantity ?? 0} left`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-slate-100 text-center">
            <Link
              to="/products"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
            >
              Inspect full inventory catalog <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Inbound Orders</h2>
            <p className="text-xs text-slate-500">
              Latest incoming orders waiting for packing, dispatch, or review.
            </p>
          </div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition"
          >
            <span>Open All Orders</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-10 bg-slate-100 animate-pulse rounded"></div>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No Orders in System Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              When customers place orders on Giriraj Power, they will appear here in realtime.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-mono-code uppercase border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Placed Date</th>
                  <th className="py-3 px-4">Customer / Recipient</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {recentOrders.map((order) => {
                  const statusCfg = getStatusConfig(order.status);
                  const payBadge = getPaymentBadge(order.payment_status);

                  return (
                    <tr
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-slate-50/80 transition cursor-pointer group"
                    >
                      {/* Order ID */}
                      <td className="py-3 px-4 font-mono-code font-bold text-slate-900 group-hover:text-amber-700">
                        {formatShortId(order.id)}
                      </td>

                      {/* Placed Date */}
                      <td className="py-3 px-4 text-slate-500 text-xs">
                        {formatDateTime(order.placed_at)}
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4 font-medium">
                        <div className="font-semibold text-slate-900">{order.recipient_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono-code">
                          {order.recipient_phone}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        {order.city}, {order.state}{' '}
                        <span className="font-mono-code text-[11px] text-slate-400">
                          ({order.pincode})
                        </span>
                      </td>

                      {/* Amount & Payment */}
                      <td className="py-3 px-4 text-right font-mono-code font-bold text-slate-900">
                        <div>{formatCurrency(order.total_amount)}</div>
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-sans border font-medium ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                        >
                          {payBadge.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                          {statusCfg.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
