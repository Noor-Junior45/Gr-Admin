import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList, updateOrderStatus } from '../services/orderService';
import {
  formatCurrency,
  formatTimeElapsed,
  formatTimeOnly,
  formatShortId,
  formatDateTime,
} from '../utils/formatters';
import {
  Clock,
  Box,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShoppingBag,
  SlidersHorizontal,
  XCircle,
  FileText,
  User,
} from 'lucide-react';

export const PendingOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const loadPendingOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'pending', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load pending orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPendingOrders();

    // Listen to real-time order insertions/updates
    const channel = supabase
      .channel('pending_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadPendingOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPendingOrders]);

  const handleAcceptAndPack = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'packing');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to accept order');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptAll = async () => {
    if (orders.length === 0) return;
    if (!window.confirm(`Accept all ${orders.length} pending orders and move to Packing?`)) return;

    setBulkProcessing(true);
    try {
      for (const order of orders) {
        await updateOrderStatus(order.id, 'packing');
      }
      setOrders([]);
    } catch (err: any) {
      alert('Error during bulk acceptance: ' + err.message);
      loadPendingOrders();
    } finally {
      setBulkProcessing(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      o.recipient_name?.toLowerCase().includes(term) ||
      o.recipient_phone?.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.city?.toLowerCase().includes(term) ||
      o.pincode?.includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div
        id="pending-orders-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 font-mono-code">
                <Clock className="w-3.5 h-3.5 text-amber-700 animate-pulse" />
                Stage 1 • Pending Review
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} orders awaiting warehouse acceptance
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Pending Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Verify stock availability and accept customer orders to begin the picking & packing workflow.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            {orders.length > 0 && (
              <button
                id="btn-accept-all-pending"
                type="button"
                onClick={handleAcceptAll}
                disabled={bulkProcessing || loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                <Box className="w-3.5 h-3.5" />
                <span>{bulkProcessing ? 'Accepting All...' : `Accept All (${orders.length})`}</span>
              </button>
            )}

            <button
              id="btn-refresh-pending"
              type="button"
              onClick={() => loadPendingOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-pending"
            type="text"
            placeholder="Search by customer, phone, PIN or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code self-end sm:self-center">
          Showing {filteredOrders.length} of {orders.length} pending
        </div>
      </div>

      {/* Orders Grid / List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading pending orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">All caught up!</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No pending orders match your search criteria.'
              : 'There are currently no new pending orders waiting for warehouse confirmation.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isProcessing = processingId === order.id;
            const items = order.order_items || [];
            const isUrgent = order.placed_at
              ? (new Date().getTime() - new Date(order.placed_at).getTime()) > 15 * 60 * 1000
              : false;

            return (
              <div
                key={order.id}
                id={`pending-card-${order.id}`}
                className={`bg-white rounded-2xl border transition-all duration-150 p-4 flex flex-col justify-between shadow-xs hover:shadow-sm ${
                  isUrgent ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-amber-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        {isUrgent && (
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 text-[10px] font-bold rounded font-mono-code uppercase">
                            Overdue
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {order.placed_at ? formatTimeElapsed(order.placed_at) : 'Just now'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <span className="text-[10px] font-mono-code uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                        {order.payment_method || 'COD'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.recipient_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 font-mono-code text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <a href={`tel:${order.recipient_phone}`} className="hover:underline hover:text-slate-900">
                        {order.recipient_phone}
                      </a>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {order.address_line1}, {order.city} - {order.pincode}
                      </span>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        Items ({order.item_count || items.length})
                      </span>
                    </div>

                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs text-slate-600">
                            <span className="truncate font-medium">
                              {it.quantity}x {it.product_name}
                            </span>
                            <span className="font-mono-code text-[11px] text-slate-500 shrink-0 ml-2">
                              {formatCurrency(it.price_at_purchase * it.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-[11px] text-slate-400 italic">No item breakdown available</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    Details
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleAcceptAndPack(order.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-98"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{isProcessing ? 'Accepting...' : 'Accept & Start Packing'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
