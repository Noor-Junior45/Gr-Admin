import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Order, Delivery, DeliveryPartner } from '../types';
import { fetchOrdersList, fetchOrderById } from '../services/orderService';
import {
  fetchDeliveryPartners,
  fetchDeliveryByOrderId,
  assignDeliveryPartner,
  fetchAllAssignedDeliveries,
} from '../services/deliveryService';
import {
  formatCurrency,
  formatShortId,
  formatDateTime,
  formatTimeElapsed,
} from '../utils/formatters';
import { AssignPartnerModal } from '../components/AssignPartnerModal';
import {
  Clock,
  Phone,
  ChevronRight,
  AlertCircle,
  Bike,
  MapPin,
  User,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';

export const ReadyOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Record<string, Delivery>>({});
  const [, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigningOrder, setAssigningOrder] = useState<Order | null>(null);

  const loadReadyOrders = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      // 1. Fetch assigned deliveries across both Supabase & local storage
      const [allDeliveriesMap, partnerList] = await Promise.all([
        fetchAllAssignedDeliveries(),
        fetchDeliveryPartners(),
      ]);

      // 2. Fetch active orders from database without restrictive status filtering
      // so orders where a rider was assigned (even in pending, confirmed, packing, packed) are fully loaded
      const orderRes = await fetchOrdersList({ pageSize: 500 });
      let loadedOrders = orderRes.orders;

      // 3. Check for any orders that have an assigned rider but were not in the initial order list
      const loadedOrderIds = new Set(loadedOrders.map((o) => o.id));
      const missingAssignedIds = Object.keys(allDeliveriesMap).filter(
        (id) => !loadedOrderIds.has(id)
      );

      if (missingAssignedIds.length > 0) {
        const extraOrders = await Promise.all(
          missingAssignedIds.map(async (id) => {
            try {
              const res = await fetchOrderById(id);
              return res.order;
            } catch {
              return null;
            }
          })
        );
        const validExtraOrders = extraOrders.filter((o): o is Order => Boolean(o));
        loadedOrders = [...loadedOrders, ...validExtraOrders];
      }

      setOrders(loadedOrders);
      setPartners(partnerList);

      // 4. Build comprehensive delivery map
      const delMap: Record<string, Delivery> = { ...allDeliveriesMap };
      loadedOrders.forEach((order) => {
        if (order.delivery && !delMap[order.id]) {
          delMap[order.id] = order.delivery;
        }
      });
      setDeliveries(delMap);
    } catch (err: any) {
      console.error('Failed to load ready for rider queue:', err);
      setError(err?.message || 'Failed to load ready for rider queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReadyOrders();

    // Subscribe to realtime changes on orders & deliveries
    const ordersChannel = supabase
      .channel('ready_page_orders_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadReadyOrders(true)
      )
      .subscribe();

    const deliveriesChannel = supabase
      .channel('ready_page_deliveries_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => loadReadyOrders(true)
      )
      .subscribe();

    // Realtime listener for in-app rider assignment events across pages/tabs
    const handleRiderChange = () => {
      loadReadyOrders(true);
    };
    window.addEventListener('rider_assigned', handleRiderChange);
    window.addEventListener('storage', handleRiderChange);

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(deliveriesChannel);
      window.removeEventListener('rider_assigned', handleRiderChange);
      window.removeEventListener('storage', handleRiderChange);
    };
  }, [loadReadyOrders]);

  const handlePartnerAssigned = async (
    partnerId: string,
    estimatedMinutes: number,
    notes?: string
  ) => {
    if (!assigningOrder) return;
    try {
      const newDelivery = await assignDeliveryPartner(
        assigningOrder.id,
        partnerId,
        estimatedMinutes,
        notes
      );

      setDeliveries((prev) => ({
        ...prev,
        [assigningOrder.id]: newDelivery,
      }));

      setAssigningOrder(null);
      // Reload quietly to reflect any database updates
      loadReadyOrders(true);
    } catch (err: any) {
      alert(err.message || 'Failed to assign rider');
    }
  };

  // Filter strictly only active orders where a delivery rider is assigned
  const riderAssignedOrders = orders.filter((order) => {
    if (order.status === 'delivered' || order.status === 'cancelled') return false;

    const del = deliveries[order.id] || order.delivery;
    if (del?.status === 'delivered' || del?.status === 'returned') return false;

    return Boolean(
      del?.delivery_partner_id ||
      del?.delivery_partner ||
      order.delivery?.delivery_partner_id ||
      order.delivery?.delivery_partner ||
      (order as any).rider_id ||
      (order as any).rider_name
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
            onClick={() => loadReadyOrders(false)}
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
          <p className="text-sm font-semibold text-slate-700">Loading rider queue...</p>
        </div>
      ) : riderAssignedOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center mx-auto text-purple-600">
            <Bike className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders with assigned riders</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Only orders with an assigned delivery partner appear here. Assign a rider during order packing to help them reach the warehouse early.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
          {riderAssignedOrders.map((order) => {
            const items = order.order_items || [];
            const isPaid = ['paid', 'completed', 'success'].includes(
              (order.payment_status || '').toLowerCase()
            );
            const delivery = deliveries[order.id] || order.delivery;
            const assignedRider = delivery?.delivery_partner || (order as any).rider;

            return (
              <div
                key={order.id}
                id={`rider-card-${order.id}`}
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
                  {/* Button 1: Packing / Ready to Deliver (Soft Cream Liquid Glass Pill) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/orders/${order.id}`);
                    }}
                    title={`Order is ${order.status === 'packing' ? 'packing' : 'ready to deliver'} - click to view order`}
                    className="relative overflow-hidden w-full h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-[#5A4934] bg-gradient-to-b from-[#FFFDF9]/95 via-[#FAF5EC]/95 to-[#EFE7D8]/95 border border-[#E5DAC8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_4px_rgba(140,110,80,0.08)] backdrop-blur-md hover:from-white hover:to-[#EAE0CF] active:scale-[0.98] transition-all cursor-pointer group/status"
                  >
                    {/* Liquid glass top specular reflection */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/70 via-white/20 to-transparent rounded-t-full" />

                    {order.status === 'packing' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
                        <span className="truncate">Packing</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0 shadow-[0_0_4px_rgba(16,185,129,0.5)]" />
                        <span className="truncate">Ready to deliver</span>
                      </>
                    )}
                  </button>

                  {/* Button 2: Rider Name (Red Liquid Glass Pill) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAssigningOrder(order);
                    }}
                    title="Click to view or change assigned rider"
                    className="relative overflow-hidden w-full h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] sm:text-xs font-semibold text-white bg-gradient-to-b from-red-500 via-red-600 to-red-700 border border-red-400/50 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.45),0_2px_5px_rgba(220,38,38,0.3)] backdrop-blur-md hover:from-red-400 hover:to-red-600 active:scale-[0.98] transition-all cursor-pointer group/rider"
                  >
                    {/* Liquid glass top specular reflection */}
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />

                    <Bike className="w-3.5 h-3.5 text-white/95 shrink-0 drop-shadow-xs" />
                    <span className="truncate drop-shadow-xs">
                      {assignedRider?.name || (order as any).rider_name || 'Rider Assigned'}
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/80 shrink-0 group-hover/rider:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Rider Modal */}
      {assigningOrder && (
        <AssignPartnerModal
          isOpen={!!assigningOrder}
          orderId={assigningOrder.id}
          currentPartnerId={deliveries[assigningOrder.id]?.delivery_partner_id}
          defaultNotes={assigningOrder.delivery_notes}
          onClose={() => setAssigningOrder(null)}
          onAssign={handlePartnerAssigned}
        />
      )}
    </div>
  );
};
