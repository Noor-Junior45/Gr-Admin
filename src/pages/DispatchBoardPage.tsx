import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, Delivery } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  fetchDeliveryByOrderId,
} from '../services/deliveryService';
import {
  formatCurrency,
  formatShortId,
  formatDateTime,
  formatTimeElapsed,
} from '../utils/formatters';
import {
  Clock,
  Phone,
  ChevronRight,
  AlertCircle,
  Truck,
  Bike,
  MapPin,
  User,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';

/**
 * Live stopwatch/countdown format: computes hours, minutes, seconds elapsed
 * since the order left the warehouse or was picked up.
 */
function formatLiveElapsed(isoString: string | null | undefined, nowMs: number): string {
  if (!isoString) return '0s';
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return '0s';
    const diffMs = Math.max(0, nowMs - timestamp);
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  } catch {
    return '0s';
  }
}

export const DispatchBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Live timer tick every 1000ms so elapsed time since leaving warehouse counts in real time
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDispatchedOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      // Only fetch orders that are already out from warehouse / left for delivery
      const orderRes = await fetchOrdersList({ statusIn: ['shipped'], pageSize: 500 });

      setOrders(orderRes.orders);

      // Load associated delivery status/rider assignments for these orders
      const delMap: Record<string, Delivery> = {};
      await Promise.all(
        orderRes.orders.map(async (order) => {
          try {
            const del = await fetchDeliveryByOrderId(order.id);
            if (del) delMap[order.id] = del;
          } catch {
            // Ignore individual fetch failure
          }
        })
      );
      setDeliveries(delMap);
    } catch (err: any) {
      console.error('Failed to load dispatched orders queue:', err);
      setError(err?.message || 'Failed to load dispatched orders queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDispatchedOrders();

    // Subscribe to realtime changes on orders & deliveries
    const ordersChannel = supabase
      .channel('dispatch_page_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadDispatchedOrders(true)
      )
      .subscribe();

    const deliveriesChannel = supabase
      .channel('dispatch_page_deliveries_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => loadDispatchedOrders(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(deliveriesChannel);
    };
  }, [loadDispatchedOrders]);

  // Filter strictly for orders that have already left warehouse / are out for delivery
  const outForDeliveryOrders = orders.filter((order) => {
    const del = deliveries[order.id];
    // Exclude completed/failed/cancelled
    if (['delivered', 'cancelled', 'failed'].includes(order.status)) return false;
    if (del?.status === 'delivered' || del?.status === 'failed') return false;

    // Must be shipped or delivery marked picked_up / out_for_delivery / near_destination
    return (
      order.status === 'shipped' ||
      del?.status === 'picked_up' ||
      del?.status === 'out_for_delivery' ||
      del?.status === 'near_destination'
    );
  });

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
            onClick={() => loadDispatchedOrders(false)}
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
          <p className="text-sm font-semibold text-slate-700">Loading dispatch queue...</p>
        </div>
      ) : outForDeliveryOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders currently out for delivery</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Only orders that have already left the warehouse and are en route with a delivery rider appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {outForDeliveryOrders.map((order) => {
            const items = order.order_items || [];
            const isPaid = ['paid', 'completed', 'success'].includes(
              (order.payment_status || '').toLowerCase()
            );
            const delivery = deliveries[order.id] || order.delivery;
            const assignedRider = delivery?.delivery_partner || (order as any).rider;

            // Timestamp when order left warehouse or was picked up by rider
            const leftWarehouseTime =
              delivery?.picked_up_at ||
              delivery?.out_for_delivery_at ||
              order.shipped_at ||
              delivery?.updated_at ||
              order.updated_at ||
              order.placed_at;

            return (
              <div
                key={order.id}
                id={`dispatch-card-${order.id}`}
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

                  {/* Customer Info */}
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{order.recipient_name || 'Customer'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-600 font-mono-code text-[11px]">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <a
                        href={`tel:${order.recipient_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline hover:text-slate-900"
                      >
                        {order.recipient_phone || 'N/A'}
                      </a>
                    </div>

                    <div className="flex items-start gap-1.5 text-slate-500 text-[11px]">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        {[order.address_line1, order.city, order.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>

                    {(assignedRider?.name || (order as any).rider_name) && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono-code text-[11px] pt-0.5">
                        <Bike className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">Rider: {assignedRider?.name || (order as any).rider_name}</span>
                      </div>
                    )}
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

                {/* Bottom Row: Liquid Glass Pill Buttons (Equal Length) */}
                <div className="grid grid-cols-2 gap-2 w-full mt-2.5 pt-2.5 border-t border-slate-100">
                  {/* Button 1: Left: Elapsed Time (Blue Liquid Glass Pill) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/orders/${order.id}`);
                    }}
                    title={`Time elapsed since parcel left warehouse: ${formatLiveElapsed(leftWarehouseTime, now)}`}
                    className="relative overflow-hidden w-full h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border border-blue-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_2px_5px_rgba(37,99,235,0.3)] backdrop-blur-md hover:from-blue-400 hover:to-blue-600 active:scale-[0.98] transition-all cursor-pointer group/time"
                  >
                    {/* Liquid glass top specular reflection */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />

                    <Truck className="w-3.5 h-3.5 text-white/95 shrink-0 animate-pulse drop-shadow-xs" />
                    <span className="truncate drop-shadow-xs font-mono-code">
                      Left: {formatLiveElapsed(leftWarehouseTime, now)}
                    </span>
                  </button>

                  {/* Button 2: Out for Delivery (Red Liquid Glass Pill) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/orders/${order.id}`);
                    }}
                    title="Out for delivery - click to view order details"
                    className="relative overflow-hidden w-full h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-b from-red-500 via-red-600 to-red-700 border border-red-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_2px_5px_rgba(220,38,38,0.3)] backdrop-blur-md hover:from-red-400 hover:to-red-600 active:scale-[0.98] transition-all cursor-pointer group/dispatch"
                  >
                    {/* Liquid glass top specular reflection */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />

                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.9)] animate-pulse shrink-0" />
                    <span className="truncate drop-shadow-xs">Out for Delivery</span>
                    <ChevronRight className="w-3 h-3 text-white/80 shrink-0 group-hover/dispatch:translate-x-0.5 transition-transform" />
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
