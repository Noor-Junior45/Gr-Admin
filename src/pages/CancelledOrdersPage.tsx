import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList, updateOrderStatus } from '../services/orderService';
import {
  formatCurrency,
  formatDateTime,
  formatShortId,
} from '../utils/formatters';
import {
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  RotateCcw,
  Calendar,
  User,
  Phone,
  MapPin,
  ShoppingBag,
} from 'lucide-react';

export const CancelledOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadCancelledOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'cancelled', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load cancelled orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCancelledOrders();

    const channel = supabase
      .channel('cancelled_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadCancelledOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadCancelledOrders]);

  const handleReactivate = async (orderId: string) => {
    if (!window.confirm('Reopen and restore this order back to Pending Review?')) return;
    setProcessingId(orderId);
    try {
      await updateOrderStatus(orderId, 'pending');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate order');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    return (
      o.recipient_name?.toLowerCase().includes(term) ||
      o.recipient_phone?.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      o.cancellation_reason?.toLowerCase().includes(term) ||
      o.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div
        id="cancelled-orders-header"
        className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1.5 font-mono-code">
                <XCircle className="w-3.5 h-3.5 text-rose-700" />
                Exceptions & Cancellations
              </span>
              <span className="text-xs text-slate-400 font-mono-code">
                {orders.length} voided orders
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif-display font-bold text-slate-900">
              Cancelled Orders
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Archive of cancelled and voided orders with reason records and inventory restock logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start md:self-center">
            <button
              id="btn-refresh-cancelled"
              type="button"
              onClick={() => loadCancelledOrders(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-cancelled"
            type="text"
            placeholder="Search cancelled archive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition"
          />
        </div>

        <div className="text-xs text-slate-500 font-mono-code">
          Showing {filteredOrders.length} of {orders.length} cancelled
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading cancelled orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-500">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Cancelled Orders</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {searchQuery
              ? 'No cancelled orders match your search criteria.'
              : 'There are no voided or cancelled orders recorded in the system.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const isProcessing = processingId === order.id;

            return (
              <div
                key={order.id}
                id={`cancelled-card-${order.id}`}
                className="bg-white rounded-2xl border border-rose-200 hover:border-rose-300 p-4 flex flex-col justify-between shadow-xs transition-all duration-150"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-rose-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                        <span className="px-1.5 py-0.2 bg-rose-100 text-rose-900 text-[10px] font-bold rounded font-mono-code uppercase border border-rose-300">
                          Cancelled
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono-code flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {order.updated_at ? formatDateTime(order.updated_at) : 'Voided'}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(order.total_amount)}
                      </div>
                      <span className="text-[10px] font-mono-code text-slate-500">
                        {order.payment_method || 'COD'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="truncate">{order.recipient_name}</span>
                      <span className="font-mono-code text-[11px] text-slate-500">{order.recipient_phone}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">
                      {order.address_line1}, {order.city}
                    </div>
                  </div>

                  {/* Cancellation Reason Box */}
                  <div className="bg-rose-50/70 rounded-xl p-2.5 border border-rose-200/80 space-y-1 text-xs text-rose-950">
                    <div className="flex items-center gap-1 font-bold text-rose-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Cancellation Reason</span>
                    </div>
                    <p className="text-[11px] text-rose-800 italic">
                      "{order.cancellation_reason || 'Customer request / Store cancellation'}"
                    </p>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    View Details
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleReactivate(order.id)}
                    disabled={isProcessing}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isProcessing ? 'Restoring...' : 'Restore Order'}</span>
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
