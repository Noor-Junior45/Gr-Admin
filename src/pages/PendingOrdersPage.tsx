import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList, updateOrderStatus, deleteOrder } from '../services/orderService';
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
  Trash2,
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(`Permanently delete order #${formatShortId(orderId)} from database? This will completely remove it from user history.`)) {
      return;
    }
    setProcessingId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete order.');
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
    <div className="space-y-4">
      {/* Streamlined Search & Action Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-pending"
            type="text"
            placeholder="Search pending orders by customer, phone, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            {orders.length} to review
          </span>

          {orders.length > 0 && (
            <button
              id="btn-accept-all-pending"
              type="button"
              onClick={handleAcceptAll}
              disabled={bulkProcessing || loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Box className="w-3.5 h-3.5" />
              <span>{bulkProcessing ? 'Accepting...' : `Accept All`}</span>
            </button>
          )}

          <button
            id="btn-refresh-pending"
            type="button"
            onClick={() => loadPendingOrders(true)}
            disabled={refreshing || loading}
            className="flex items-center justify-center p-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition active:scale-95 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
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
                className={`bg-white rounded-xl border transition-all duration-150 p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs ${
                  isUrgent ? 'border-amber-400 ring-1 ring-amber-300/70' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                      
                      {/* Date & Time beside Just Now / Elapsed Time */}
                      <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-slate-500 font-mono-code mt-0.5">
                        <span className="flex items-center gap-1 font-medium text-amber-700">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          {order.placed_at ? formatTimeElapsed(order.placed_at) : 'Just now'}
                        </span>
                        {order.placed_at && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-600">{formatDateTime(order.placed_at)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
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
                  <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        Items ({order.item_count || items.length})
                      </span>
                    </div>

                    <div className="space-y-1 max-h-20 overflow-y-auto custom-scrollbar pr-1">
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

                {/* Center Long Red Liquid Apple Glassmorphism Pending Button */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-center w-full">
                  <Link
                    to={`/orders/${order.id}`}
                    id={`btn-pending-action-${order.id}`}
                    className="w-full sm:w-[94%] relative overflow-hidden flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl font-bold text-xs sm:text-sm text-white tracking-wider uppercase shadow-[0_8px_20px_-3px_rgba(239,68,68,0.45),inset_0_1px_1.5px_0_rgba(255,255,255,0.55),inset_0_-2px_4px_0_rgba(0,0,0,0.2)] bg-gradient-to-r from-red-600 via-rose-600 to-red-600 backdrop-blur-xl border border-white/35 cursor-pointer select-none"
                    title="View pending order details"
                  >
                    {/* Liquid Apple Glass Surface Sheen & Specular Reflection */}
                    <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-2xl" />

                    {/* Button Content */}
                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-pulse" />
                      <span>Pending</span>
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
