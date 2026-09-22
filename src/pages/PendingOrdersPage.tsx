import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList, updateOrderStatus, deleteOrder, cancelOrderRPC } from '../services/orderService';
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
  Loader2,
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

  const handleCancelOrder = async (orderId: string, orderShortId: string) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel order #${orderShortId}? Items will be restocked to inventory.`);
    if (!confirmCancel) return;

    setProcessingId(orderId);
    try {
      await cancelOrderRPC(orderId, 'Cancelled by store operator');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order.');
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

                  {/* Order Items Details (Customer info is hidden from outside of page) */}
                  <Link
                    to={`/orders/${order.id}`}
                    className="block bg-slate-50 hover:bg-slate-100/90 transition-colors rounded-xl p-3 border border-slate-200/80 group"
                    title="View item and order details"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                      <span className="flex items-center gap-1.5 font-bold text-slate-900">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        Items ({order.item_count || items.length})
                      </span>
                      <span className="text-[11px] text-amber-600 font-medium group-hover:underline">
                        View details &rarr;
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {items.length > 0 ? (
                        items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs text-slate-700 py-0.5 border-b border-slate-100 last:border-0">
                            <span className="truncate font-medium flex items-center gap-1.5">
                              <span className="font-mono-code text-[11px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                {it.quantity}x
                              </span>
                              <span className="truncate">{it.product_name}</span>
                            </span>
                            <span className="font-mono-code text-[11px] font-semibold text-slate-600 shrink-0 ml-2">
                              {formatCurrency(it.price_at_purchase * it.quantity)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-1">No item breakdown available</div>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Action Buttons: Divided in two equal parts (Left: Cancel, Right: Accept) */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    id={`btn-cancel-order-${order.id}`}
                    onClick={() => handleCancelOrder(order.id, formatShortId(order.id))}
                    disabled={isProcessing}
                    className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm text-rose-700 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 transition shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Cancel order"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-accept-order-${order.id}`}
                    onClick={() => handleAcceptAndPack(order.id)}
                    disabled={isProcessing}
                    className="relative overflow-hidden flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-500 transition shadow-[0_2px_8px_rgba(16,185,129,0.3)] cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Accept order and move to Packing"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>Accept</span>
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
