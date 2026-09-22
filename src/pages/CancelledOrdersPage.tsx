import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList } from '../services/orderService';
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
  Calendar,
} from 'lucide-react';

export const CancelledOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCancelledOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetchOrdersList({ status: 'cancelled', pageSize: 150 });
      setOrders(res.orders);
    } catch (err) {
      console.error('Failed to load cancelled orders from backend:', err);
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

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const term = searchQuery.toLowerCase();
    const reason = (o.cancellation_reason || (o as any).cancel_reason || o.notes || '').toLowerCase();
    return (
      o.recipient_name?.toLowerCase().includes(term) ||
      o.recipient_phone?.includes(term) ||
      o.id.toLowerCase().includes(term) ||
      reason.includes(term) ||
      o.city?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Streamlined Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 shadow-2xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-cancelled"
            type="text"
            placeholder="Search cancelled archive by customer, phone, ID, reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition"
          />
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
            const cancellationReasonText =
              order.cancellation_reason ||
              (order as any).cancel_reason ||
              order.notes ||
              'Customer request / Store cancellation';

            return (
              <div
                key={order.id}
                id={`cancelled-card-${order.id}`}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-2xl border border-rose-200 hover:border-rose-400 p-4 flex flex-col justify-between shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/orders/${order.id}`);
                  }
                }}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono-code font-bold text-xs text-slate-900 group-hover:text-rose-600 transition"
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
                      "{cancellationReasonText}"
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
