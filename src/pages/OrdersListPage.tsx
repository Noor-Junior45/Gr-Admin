import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { withSkewRetry } from '../utils/supabaseHelper';
import { Order, OrderStatus } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { NotificationButton } from '../components/NotificationButton';
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
  Volume2,
  VolumeX,
} from 'lucide-react';

const STATUS_TABS: { key: 'all' | OrderStatus; label: string; icon: any }[] = [
  { key: 'all', label: 'All', icon: Inbox },
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'packing', label: 'Packing', icon: Box },
  { key: 'packed', label: 'Packed', icon: CheckCircle2 },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Sparkles },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export const OrdersListPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();

  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Fetch orders with order_items to compute item counts
      const { data, error: fetchErr } = await withSkewRetry(
        () =>
          supabase
            .from('orders')
            .select('*, order_items(id, quantity)')
            .order('placed_at', { ascending: false }),
        3,
        600
      );

      if (fetchErr) {
        // Fallback: If foreign key join fails, fetch without join
        console.warn('Join select error, trying direct orders query:', fetchErr);
        const { data: fallbackData, error: fallbackErr } = await withSkewRetry(
          () =>
            supabase
              .from('orders')
              .select('*')
              .order('placed_at', { ascending: false }),
          3,
          600
        );

        if (fallbackErr) {
          throw fallbackErr;
        }
        setOrders(fallbackData || []);
      } else {
        // Map item count
        const orderList = Array.isArray(data) ? data : [];
        const mapped = orderList.map((o: any) => ({
          ...o,
          item_count: o.order_items
            ? o.order_items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)
            : 0,
        }));
        setOrders(mapped);
      }
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load orders from Supabase.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Listen to realtime order changes to auto-update order list
    const channel = supabase
      .channel('orders_list_realtime_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('[OrdersListPage] Realtime order change detected:', payload.eventType);
          fetchOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Compute live counts for each tab
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      pending: 0,
      packing: 0,
      packed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    orders.forEach((ord) => {
      const s = (ord.status || '').toLowerCase();
      if (counts[s] !== undefined) {
        counts[s]++;
      }
    });

    return counts;
  }, [orders]);

  // Filter orders by active status tab and search query
  const filteredOrders = useMemo(() => {
    let result = orders;

    if (selectedStatus !== 'all') {
      result = result.filter(
        (o) => (o.status || '').toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((o) => {
        const nameMatch = (o.recipient_name || '').toLowerCase().includes(q);
        const phoneMatch = (o.recipient_phone || '').toLowerCase().includes(q);
        const idMatch = (o.id || '').toLowerCase().includes(q);
        const cityMatch = (o.city || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || idMatch || cityMatch;
      });
    }

    return result;
  }, [orders, selectedStatus, searchQuery]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 pb-16">
      {/* Top Controls Container */}
      <div className="bg-white/95 border-b border-slate-200 sticky top-16 z-30 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3.5 space-y-3">
          {/* Header Row: Title, Notification Settings & Refresh button */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Orders Dashboard</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200 font-mono">
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time queue for packing and dispatch
              </p>
            </div>

            <div className="flex items-center gap-2">
              <NotificationButton variant="full" />

              <button
                id="refresh-orders-btn"
                onClick={() => fetchOrders(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer min-h-[40px]"
                title="Refresh orders list"
              >
                <RefreshCw className={`w-4 h-4 text-amber-600 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              id="orders-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient name, phone, order ID, or city..."
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition min-h-[44px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition text-xs font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pt-1 pb-0.5">
            <div className="flex items-center gap-1.5 min-w-max">
              {STATUS_TABS.map((tab) => {
                const count = statusCounts[tab.key] || 0;
                const isActive = selectedStatus === tab.key;
                const TabIcon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    id={`filter-tab-${tab.key}`}
                    onClick={() => setSelectedStatus(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition whitespace-nowrap cursor-pointer min-h-[40px] ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-xs font-bold'
                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-500'}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[11px] font-mono leading-tight font-bold ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold">Unable to fetch orders</div>
              <div className="text-xs text-red-700 mt-0.5">{error}</div>
              <button
                onClick={() => fetchOrders(true)}
                className="mt-2 text-xs font-bold underline hover:text-red-900"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 pt-2">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/4"></div>
                  <div className="h-5 bg-slate-100 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-100 rounded w-1/3"></div>
                </div>
                <div className="h-8 bg-slate-100 rounded w-24 self-end sm:self-center"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center my-6 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Filter className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No Orders Found</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No orders matching "${searchQuery}". Try a different keyword or reset filters.`
                : selectedStatus !== 'all'
                ? `There are currently no orders with "${selectedStatus}" status.`
                : 'No orders recorded in the database yet.'}
            </p>
            {(searchQuery || selectedStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-amber-800 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>
        )}

        {/* Orders List Items */}
        {!loading && filteredOrders.length > 0 && (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusCfg = getStatusConfig(order.status);
              const paymentBadge = getPaymentBadge(order.payment_status);

              return (
                <div
                  key={order.id}
                  id={`order-row-${order.id}`}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="group bg-white hover:bg-amber-50/20 border border-slate-200 hover:border-amber-400 rounded-xl p-4 sm:p-5 transition shadow-xs hover:shadow-sm cursor-pointer relative active:scale-[0.998]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left details */}
                    <div className="space-y-1.5 flex-1">
                      {/* Top metadata line: Order ID + Placed Date */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {formatShortId(order.id)}
                        </span>
                        <span className="text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDateTime(order.placed_at)}
                        </span>
                        {order.address_label && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {order.address_label}
                          </span>
                        )}
                      </div>

                      {/* Recipient info */}
                      <div className="flex items-center gap-2">
                        <span className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-amber-800 transition">
                          {order.recipient_name || 'Anonymous Customer'}
                        </span>
                      </div>

                      {/* Phone & Destination */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
                        {order.recipient_phone && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-amber-600" />
                            <span className="font-mono text-slate-800">{order.recipient_phone}</span>
                          </span>
                        )}
                        <span className="text-slate-600">
                          {order.city ? `${order.city}, ${order.pincode || ''}` : order.pincode}
                        </span>
                        {order.item_count !== undefined && order.item_count > 0 && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right summary: Total, Status Badges, Action Chevron */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Price & Payment */}
                      <div className="text-left sm:text-right">
                        <div className="text-base sm:text-lg font-bold text-slate-900 font-mono">
                          {formatCurrency(order.total_amount)}
                        </div>
                        <div className="flex items-center sm:justify-end gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${paymentBadge.bg} ${paymentBadge.text} ${paymentBadge.border}`}
                          >
                            {paymentBadge.label}
                          </span>
                          {order.payment_method && (
                            <span className="text-[10px] uppercase font-mono text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              {order.payment_method}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Order Status Badge & Chevron */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotBg}`} />
                          {statusCfg.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
