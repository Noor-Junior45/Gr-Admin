import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  formatCurrency,
  formatShortId,
  formatDateTime,
  formatTimeElapsed,
} from '../utils/formatters';
import {
  Package,
  Clock,
  AlertCircle,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';

export const PackingQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPackingOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      // Only fetch orders that are currently in the packing process after acceptance
      const res = await fetchOrdersList({ status: 'packing', pageSize: 500 });
      setOrders(res.orders);
    } catch (err: any) {
      console.error('Failed to load packing queue:', err);
      setError(err?.message || 'Failed to load packing queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPackingOrders();

    const channel = supabase
      .channel('packing_queue_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadPackingOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadPackingOrders]);

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Error: </span>
            {error}
          </div>
          <button
            type="button"
            onClick={() => loadPackingOrders(false)}
            className="text-xs font-semibold underline text-rose-900 hover:text-rose-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Orders Grid / Status States */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading packing queue...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders in packing</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            There are currently no orders going through the packing process. Check Orders to accept incoming orders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {orders.map((order) => {
            const items = order.order_items || [];
            const isPaid = ['paid', 'completed', 'success'].includes(
              (order.payment_status || '').toLowerCase()
            );

            return (
              <div
                key={order.id}
                id={`packing-card-${order.id}`}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-150 p-3 sm:p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs group cursor-pointer"
              >
                {/* Card Top & Middle Content */}
                <div className="space-y-2.5">
                  {/* Card Header: Order ID, Date/Time & Elapsed on left; Price & Paid badge on right */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          to={`/orders/${order.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono-code font-bold text-xs text-slate-900 hover:text-amber-600 transition"
                        >
                          #{formatShortId(order.id)}
                        </Link>
                      </div>

                      {/* Date & Time beside Elapsed Time */}
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
                      <div className="mt-0.5">
                        {isPaid ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-800 border border-emerald-400/40"
                            title="Payment verified"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-900 border border-amber-400/40"
                            title="Payment pending"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Unpaid
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="bg-slate-50 rounded-lg p-2 space-y-1 border border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-slate-400" />
                        Items ({order.item_count || items.length || 1})
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

                {/* Center Long Blue Liquid Apple Glassmorphism Packing in Progress Button */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-center w-full">
                  <Link
                    to={`/orders/${order.id}`}
                    id={`btn-packing-action-${order.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:w-[94%] relative overflow-hidden flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl font-bold text-xs sm:text-sm text-white tracking-wider uppercase shadow-[0_8px_20px_-3px_rgba(37,99,235,0.45),inset_0_1px_1.5px_0_rgba(255,255,255,0.55),inset_0_-2px_4px_0_rgba(0,0,0,0.2)] bg-gradient-to-r from-blue-600 via-sky-600 to-blue-600 backdrop-blur-xl border border-white/35 cursor-pointer select-none hover:brightness-105 active:scale-[0.99] transition-all"
                    title="View packing order details"
                  >
                    {/* Liquid Apple Glass Surface Sheen & Specular Reflection */}
                    <div className="absolute inset-x-0 top-0 h-[48%] bg-gradient-to-b from-white/35 via-white/10 to-transparent pointer-events-none rounded-t-2xl" />

                    {/* Button Content */}
                    <span className="relative z-10 flex items-center justify-center gap-2 drop-shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] animate-pulse" />
                      <span>Packing in progress</span>
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
