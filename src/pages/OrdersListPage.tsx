import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, OrderStatus, OrderFilters } from '../types';
import { fetchOrdersList, exportOrdersToCSV } from '../services/orderService';
import { useNotifications } from '../context/NotificationContext';
import { StatusTimelineSelector } from '../components/StatusTimelineSelector';
import {
  formatCurrency,
  formatDateTime,
  formatShortId,
  getStatusConfig,
  getPaymentBadge,
} from '../utils/formatters';
import {
  Search,
  RefreshCw,
  Phone,
  Package,
  ChevronRight,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  Truck,
  Box,
  XCircle,
  Inbox,
  Sparkles,
  Download,
  X,
  Calendar,
  CreditCard,
  ArrowUpDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Check,
  Layers,
  Radio,
} from 'lucide-react';

export const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { newOrderCountSinceOpen, resetNewOrderCount } = useNotifications();

  // Parse filters from URL query parameters
  const initialStatus = (searchParams.get('status') as 'all' | OrderStatus) || 'all';
  const initialPaymentStatus = (searchParams.get('paymentStatus') as any) || 'all';
  const initialPaymentMethod = (searchParams.get('paymentMethod') as any) || 'all';
  const initialDateRange = (searchParams.get('dateRange') as any) || 'all';

  const [statusTab, setStatusTab] = useState<'all' | OrderStatus>(initialStatus);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>(initialPaymentStatus);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>(initialPaymentMethod);
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(initialDateRange);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const [sortBy, setSortBy] = useState<
    'placed_at_desc' | 'placed_at_asc' | 'total_desc' | 'total_asc' | 'status'
  >('placed_at_desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statusCounts, setStatusCounts] = useState<{
    all: number;
    pending: number;
    packing: number;
    packed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  }>({
    all: 0,
    pending: 0,
    packing: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);

  const loadStatusCounts = useCallback(async () => {
    try {
      const { data } = await supabase.from('orders').select('status');
      if (data) {
        const counts = {
          all: data.length,
          pending: 0,
          packing: 0,
          packed: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        };
        data.forEach((row: any) => {
          const st = (row.status || '').toLowerCase();
          if (st === 'pending' || st === 'confirmed') counts.pending++;
          else if (st === 'packing') counts.packing++;
          else if (st === 'packed') counts.packed++;
          else if (st === 'shipped') counts.shipped++;
          else if (st === 'delivered') counts.delivered++;
          else if (st === 'cancelled') counts.cancelled++;
        });
        setStatusCounts(counts);
      }
    } catch (err) {
      console.warn('Could not load status counts:', err);
    }
  }, []);

  // Synchronize state with URL parameters
  useEffect(() => {
    const s = searchParams.get('status') as 'all' | OrderStatus;
    if (s && s !== statusTab) {
      setStatusTab(s);
      setPage(1);
    }
  }, [searchParams]);

  const loadOrders = useCallback(
    async (isManual = false) => {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const filters: Partial<OrderFilters> = {
          status: statusTab,
          paymentStatus: paymentStatusFilter as any,
          paymentMethod: paymentMethodFilter as any,
          dateRange: dateRangeFilter as any,
          customStartDate: customStartDate || undefined,
          customEndDate: customEndDate || undefined,
          searchQuery,
          sortBy,
          page,
          pageSize,
        };

        const [result] = await Promise.all([
          fetchOrdersList(filters),
          loadStatusCounts(),
        ]);
        setOrders(result.orders);
        setTotalCount(result.totalCount);
      } catch (err: any) {
        console.error('Failed to fetch orders:', err);
        setError(err.message || 'Failed to load orders.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      statusTab,
      paymentStatusFilter,
      paymentMethodFilter,
      dateRangeFilter,
      customStartDate,
      customEndDate,
      searchQuery,
      sortBy,
      page,
      pageSize,
      loadStatusCounts,
    ]
  );

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime subscription to live updates
  useEffect(() => {
    const channel = supabase
      .channel('orders_page_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[OrdersListPage] Realtime event:', payload.eventType);
          loadOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  const handleStatusChange = (newStatus: 'all' | OrderStatus) => {
    setStatusTab(newStatus);
    setPage(1);
    const newParams = new URLSearchParams(searchParams);
    if (newStatus === 'all') {
      newParams.delete('status');
    } else {
      newParams.set('status', newStatus);
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setStatusTab('all');
    setPaymentStatusFilter('all');
    setPaymentMethodFilter('all');
    setDateRangeFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSearchQuery('');
    setSortBy('placed_at_desc');
    setPage(1);
    setSearchParams({});
  };

  const hasActiveFilters =
    statusTab !== 'all' ||
    paymentStatusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    dateRangeFilter !== 'all' ||
    Boolean(searchQuery.trim());

  const handleExportCSV = () => {
    exportOrdersToCSV(
      orders,
      `giriraj_orders_${statusTab}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Header Box - Modern Enterprise Registry Design */}
      <div
        id="order-fulfillment-registry-box"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
                <Layers className="w-3 h-3 text-amber-600" />
                Fulfillment Operations
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900 tracking-tight">
                Order Fulfillment Registry
              </h1>
              <span className="text-xs font-mono-code bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200 font-medium">
                {totalCount} {totalCount === 1 ? 'order' : 'orders'} {statusTab !== 'all' ? `(${statusTab})` : 'total'}
              </span>
            </div>

            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Real-time central registry for monitoring customer orders, queueing packing workflows, assigning delivery riders, and auditing status transitions.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {newOrderCountSinceOpen > 0 && (
              <button
                id="btn-new-orders-counter"
                type="button"
                onClick={() => {
                  resetNewOrderCount();
                  loadOrders(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-amber-400 transition animate-pulse cursor-pointer shadow-xs border border-amber-400"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>+ {newOrderCountSinceOpen} New Orders</span>
              </button>
            )}

            <button
              id="btn-export-orders-csv"
              type="button"
              onClick={handleExportCSV}
              disabled={orders.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs active:scale-98"
              title="Export filtered orders to Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-sync-fleet-orders"
              type="button"
              onClick={() => loadOrders(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl border border-slate-900 transition cursor-pointer active:scale-98 disabled:opacity-60 shadow-2xs"
              title="Refresh database records"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-200 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Fleet & Orders'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modern Fulfillment Status-Timeline Stepper */}
      <StatusTimelineSelector
        currentStatus={statusTab}
        statusCounts={statusCounts}
        onSelectStatus={handleStatusChange}
        totalOrdersCount={totalCount}
      />

      {/* Search & Filter Control Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by recipient name, phone, order ID, city, pincode..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-sans"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Selects (Desktop) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Payment Status */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cod">Cash On Delivery</option>
              <option value="failed">Failed</option>
            </select>

            {/* Date Range */}
            <select
              value={dateRangeFilter}
              onChange={(e) => {
                setDateRangeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="today">Placed Today</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="custom">Custom Date Range...</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer font-mono-code"
            >
              <option value="placed_at_desc">Newest First</option>
              <option value="placed_at_asc">Oldest First</option>
              <option value="total_desc">Highest Total</option>
              <option value="total_asc">Lowest Total</option>
              <option value="status">By Status</option>
            </select>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-2 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Reset all search queries and active filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Range Picker inputs if custom selected */}
        {dateRangeFilter === 'custom' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600">Custom Date Range:</span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">From:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">To:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setPage(1);
                loadOrders(true);
              }}
              className="px-3 py-1 bg-amber-500 text-slate-950 font-bold text-xs rounded hover:bg-amber-400 transition cursor-pointer"
            >
              Apply Dates
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-lg flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Query Error: </span>
            {error}
          </div>
          <button
            type="button"
            onClick={() => loadOrders(true)}
            className="text-xs font-semibold underline text-rose-900 hover:text-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-12 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-12 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-12 bg-slate-100 animate-pulse rounded"></div>
            <div className="h-12 bg-slate-100 animate-pulse rounded"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No matching orders found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'Try clearing active search queries or adjusting your status/payment filters.'
                : 'There are currently no orders in this view.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-3.5 py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg hover:bg-amber-400 transition cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-600 text-[11px] font-mono-code uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Placed Date</th>
                    <th className="py-3 px-4">Recipient / Phone</th>
                    <th className="py-3 px-4">Shipping Destination</th>
                    <th className="py-3 px-4 text-center">Items</th>
                    <th className="py-3 px-4 text-right">Order Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {orders.map((order) => {
                    const statusCfg = getStatusConfig(order.status);
                    const payBadge = getPaymentBadge(order.payment_status);

                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="hover:bg-slate-50/80 transition cursor-pointer group"
                      >
                        {/* Order ID */}
                        <td className="py-3.5 px-4 font-mono-code font-bold text-slate-900 group-hover:text-amber-700">
                          {formatShortId(order.id)}
                        </td>

                        {/* Placed At */}
                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                          {formatDateTime(order.placed_at)}
                        </td>

                        {/* Recipient */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="font-semibold text-slate-900">{order.recipient_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1">
                            <Phone className="w-3 h-3 opacity-60" />
                            {order.recipient_phone}
                          </div>
                        </td>

                        {/* Address */}
                        <td className="py-3.5 px-4 text-slate-600 text-xs max-w-xs">
                          <div className="truncate" title={order.address_line1}>
                            {order.address_line1}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-code">
                            {order.city}, {order.state} - {order.pincode}
                          </div>
                        </td>

                        {/* Items Count */}
                        <td className="py-3.5 px-4 text-center font-mono-code font-semibold text-slate-700">
                          {order.item_count ?? 0}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3.5 px-4 text-right font-mono-code font-bold text-slate-900">
                          <div>{formatCurrency(order.total_amount)}</div>
                          <span
                            className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-sans border font-medium ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                          >
                            {payBadge.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                            {statusCfg.label}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                            Workspace <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {orders.map((order) => {
                const statusCfg = getStatusConfig(order.status);
                const payBadge = getPaymentBadge(order.payment_status);

                return (
                  <div
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="p-4 hover:bg-slate-50 transition cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono-code font-bold text-slate-900 text-sm">
                        {formatShortId(order.id)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {order.recipient_name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono-code mt-0.5 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {order.recipient_phone}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {order.city}, {order.pincode}
                        </div>
                      </div>

                      <div className="text-right font-mono-code">
                        <div className="font-bold text-slate-900 text-base">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <span
                          className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-sans border font-medium mt-1 ${payBadge.bg} ${payBadge.text} ${payBadge.border}`}
                        >
                          {payBadge.label}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatDateTime(order.placed_at)}</span>
                      <span className="font-semibold text-amber-700 flex items-center gap-0.5">
                        Manage <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Showing{' '}
                  <span className="font-bold font-mono-code">
                    {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-bold font-mono-code">
                    {Math.min(page * pageSize, totalCount)}
                  </span>{' '}
                  of <span className="font-bold font-mono-code">{totalCount}</span> orders
                </span>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="ml-2 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700 font-mono-code"
                >
                  <option value="15">15 / page</option>
                  <option value="25">25 / page</option>
                  <option value="50">50 / page</option>
                </select>
              </div>

              {/* Page Navigator */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 font-mono-code text-xs font-bold text-slate-800">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
