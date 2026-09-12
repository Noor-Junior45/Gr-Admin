import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  UserPlus,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Order, DeliveryPartner, ProofOfDelivery } from '../types';
import { fetchOrdersList } from '../services/orderService';
import {
  fetchDeliveryPartners,
  assignDeliveryPartner,
  updateDeliveryStatus,
} from '../services/deliveryService';
import { supabase } from '../lib/supabaseClient';
import {
  formatCurrency,
  formatTimeElapsed,
  formatTimeOnly,
  formatShortId,
} from '../utils/formatters';
import { AssignPartnerModal } from '../components/AssignPartnerModal';
import { ProofOfDeliveryModal } from '../components/ProofOfDeliveryModal';
import { FailedDeliveryModal } from '../components/FailedDeliveryModal';

type LaneKey = 'unassigned' | 'assigned' | 'in_transit' | 'delivered' | 'failed';

export const DispatchBoardPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [assignModalOrder, setAssignModalOrder] = useState<Order | null>(null);
  const [podModalOrder, setPodModalOrder] = useState<Order | null>(null);
  const [failedModalOrder, setFailedModalOrder] = useState<Order | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [orderRes, partnerList] = await Promise.all([
        fetchOrdersList({ pageSize: 150 }),
        fetchDeliveryPartners(),
      ]);
      setOrders(orderRes.orders);
      setPartners(partnerList);
    } catch (err) {
      console.error('Failed to load dispatch board data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to real-time changes on orders
    const channel = supabase
      .channel('dispatch_board_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Dispatch lifecycle handlers
  const handleAssignSubmit = async (
    partnerId: string,
    estimatedMinutes: number,
    notes?: string
  ) => {
    if (!assignModalOrder) return;
    try {
      const updatedDelivery = await assignDeliveryPartner(
        assignModalOrder.id,
        partnerId,
        estimatedMinutes,
        notes
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === assignModalOrder.id
            ? { ...o, status: 'packed', delivery: updatedDelivery }
            : o
        )
      );
      setAssignModalOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to assign rider');
    }
  };

  const handleStatusProgression = async (
    orderId: string,
    nextStatus: any,
    extra?: any
  ) => {
    setProcessingOrderId(orderId);
    try {
      const updatedDelivery = await updateDeliveryStatus(orderId, nextStatus, extra);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            let updatedOrderStatus = o.status;
            if (
              nextStatus === 'picked_up' ||
              nextStatus === 'out_for_delivery' ||
              nextStatus === 'near_destination'
            ) {
              updatedOrderStatus = 'shipped';
            } else if (nextStatus === 'delivered') {
              updatedOrderStatus = 'delivered';
            } else if (nextStatus === 'failed') {
              updatedOrderStatus = 'failed';
            }
            return {
              ...o,
              status: updatedOrderStatus,
              delivery: updatedDelivery,
            };
          }
          return o;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update delivery status');
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handlePodSubmit = async (pod: ProofOfDelivery) => {
    if (!podModalOrder) return;
    try {
      await handleStatusProgression(podModalOrder.id, 'delivered', { proofOfDelivery: pod });
      setPodModalOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to record POD');
    }
  };

  const handleFailedSubmit = async (
    reason: string,
    action: 'reschedule' | 'return_to_store' | 'refund',
    notes?: string
  ) => {
    if (!failedModalOrder) return;
    try {
      await handleStatusProgression(failedModalOrder.id, 'failed', {
        failureReason: reason,
        failureAction: action,
        notes,
      });
      setFailedModalOrder(null);
    } catch (err: any) {
      alert(err.message || 'Failed to report delivery issue');
    }
  };

  // Group orders into Kanban lanes
  const unassignedOrders = orders.filter(
    (o) =>
      (o.status === 'packed' || o.status === 'confirmed' || o.status === 'pending') &&
      (!o.delivery || o.delivery.status === 'unassigned' || !o.delivery.delivery_partner_id)
  );

  const assignedOrders = orders.filter(
    (o) =>
      o.delivery?.delivery_partner_id &&
      (o.delivery.status === 'assigned' || (!o.delivery.status && o.status === 'packed'))
  );

  const inTransitOrders = orders.filter(
    (o) =>
      o.delivery?.status === 'picked_up' ||
      o.delivery?.status === 'out_for_delivery' ||
      o.delivery?.status === 'near_destination' ||
      (o.status === 'shipped' &&
        o.delivery?.status !== 'delivered' &&
        o.delivery?.status !== 'failed')
  );

  const deliveredOrders = orders.filter(
    (o) => o.status === 'delivered' || o.delivery?.status === 'delivered'
  );

  const failedOrders = orders.filter(
    (o) => o.status === 'failed' || o.delivery?.status === 'failed'
  );

  // Lane Configuration Definitions
  const lanes = [
    {
      key: 'unassigned' as const,
      title: 'Packed / Unassigned',
      count: unassignedOrders.length,
      dotColor: 'bg-slate-400',
      badgeBg: 'bg-slate-100 text-slate-700',
      orders: unassignedOrders,
      emptyText: 'No packed orders waiting for rider assignment',
    },
    {
      key: 'assigned' as const,
      title: 'Rider Assigned',
      count: assignedOrders.length,
      dotColor: 'bg-cyan-500',
      badgeBg: 'bg-cyan-100 text-cyan-800',
      orders: assignedOrders,
      emptyText: 'No assigned parcels currently awaiting pickup',
    },
    {
      key: 'in_transit' as const,
      title: 'Out for Delivery',
      count: inTransitOrders.length,
      dotColor: 'bg-blue-600 animate-pulse',
      badgeBg: 'bg-blue-100 text-blue-800',
      orders: inTransitOrders,
      emptyText: 'No parcels currently in transit on the road',
    },
    {
      key: 'delivered' as const,
      title: 'Delivered & POD',
      count: deliveredOrders.length,
      dotColor: 'bg-emerald-500',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      orders: deliveredOrders,
      emptyText: 'No deliveries recorded yet',
    },
    {
      key: 'failed' as const,
      title: 'Action Needed',
      count: failedOrders.length,
      dotColor: 'bg-rose-500',
      badgeBg: 'bg-rose-100 text-rose-800',
      orders: failedOrders,
      emptyText: 'No delivery issues reported',
    },
  ];

  // Render individual dispatch order card
  const renderCard = (order: Order, laneKey: LaneKey) => {
    const isProcessing = processingOrderId === order.id;
    const partner = order.delivery?.delivery_partner;
    const isNearDestination = order.delivery?.status === 'near_destination';
    const pod = order.delivery?.proof_of_delivery;

    return (
      <div
        key={order.id}
        className={`bg-white border rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
          isNearDestination
            ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/10'
            : laneKey === 'failed'
            ? 'border-rose-200 hover:border-rose-300'
            : laneKey === 'delivered'
            ? 'border-emerald-200/80 hover:border-emerald-300'
            : laneKey === 'assigned'
            ? 'border-cyan-200/90 hover:border-cyan-300'
            : laneKey === 'in_transit'
            ? 'border-blue-200/90 hover:border-blue-300'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        {/* Card Header: Order ID + Placed Time + Amount */}
        <div className="flex items-center justify-between gap-2">
          <Link
            to={`/orders/${order.id}`}
            className="font-mono-code font-bold text-xs text-slate-900 hover:text-blue-600 flex items-center gap-1 transition"
          >
            <span>{formatShortId(order.id)}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono-code text-slate-400">
              {formatTimeElapsed(order.placed_at)}
            </span>
            <span className="font-mono-code font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              {formatCurrency(order.total_amount)}
            </span>
          </div>
        </div>

        {/* Customer & Destination Details Box */}
        <div className="bg-slate-50/80 rounded-lg p-2.5 space-y-1.5 border border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 truncate">
              {order.recipient_name || 'Valued Customer'}
            </span>
            {order.recipient_phone && (
              <a
                href={`tel:${order.recipient_phone}`}
                className="inline-flex items-center gap-1 text-[11px] font-mono-code text-slate-600 hover:text-blue-600"
                title="Call recipient"
              >
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{order.recipient_phone}</span>
              </a>
            )}
          </div>

          <div className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-snug">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span className="line-clamp-2">
              {order.address_line1}
              {order.city ? `, ${order.city}` : ''}
              {order.pincode ? ` - ${order.pincode}` : ''}
            </span>
          </div>
        </div>

        {/* Rider Info Box (if assigned or in transit) */}
        {partner && (
          <div className="bg-cyan-50/50 border border-cyan-100 rounded-lg p-2.5 text-xs space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 font-semibold text-cyan-950 truncate">
                <Truck className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
                <span className="truncate">{partner.name}</span>
              </div>
              <span className="text-[10px] font-mono-code uppercase bg-cyan-100/70 text-cyan-800 px-1.5 py-0.5 rounded shrink-0">
                {partner.vehicle_type || 'Rider'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-cyan-800/80 pt-0.5">
              {partner.phone ? (
                <a
                  href={`tel:${partner.phone}`}
                  className="hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-cyan-600" />
                  <span>{partner.phone}</span>
                </a>
              ) : (
                <span className="text-slate-400">No phone on file</span>
              )}

              {order.delivery?.estimated_delivery_at && (
                <span className="font-mono-code text-[10px] flex items-center gap-1 text-cyan-900 font-medium">
                  <Clock className="w-3 h-3 text-cyan-600" />
                  ETA: {formatTimeOnly(order.delivery.estimated_delivery_at)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Proof of Delivery Info Box (Delivered Lane) */}
        {pod && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-lg p-2.5 text-[11px] space-y-1">
            <div className="flex items-center justify-between font-semibold text-emerald-900">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Received by: {pod.recipient_name || order.recipient_name}</span>
              </span>
              <span className="text-[10px] font-mono-code uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                {pod.method}
              </span>
            </div>
            {order.delivered_at && (
              <div className="text-slate-500 font-mono-code text-[10px]">
                Completed: {formatTimeOnly(order.delivered_at)}
              </div>
            )}
          </div>
        )}

        {/* Delivery Failure Info Box (Action Needed Lane) */}
        {laneKey === 'failed' && (
          <div className="bg-rose-50/80 border border-rose-200 rounded-lg p-2.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Issue: {order.delivery?.failure_reason || 'Delivery uncompleted'}</span>
            </div>
            <div className="text-[11px] text-rose-800">
              Next Action: <span className="font-semibold">{order.delivery?.failure_action || 'Reschedule'}</span>
            </div>
          </div>
        )}

        {/* Action Buttons Box */}
        <div className="pt-2 border-t border-slate-100">
          {laneKey === 'unassigned' && (
            <button
              type="button"
              onClick={() => setAssignModalOrder(order)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign Delivery Rider</span>
            </button>
          )}

          {laneKey === 'assigned' && (
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => handleStatusProgression(order.id, 'picked_up')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <Truck className={`w-3.5 h-3.5 ${isProcessing ? 'animate-bounce' : ''}`} />
              <span>{isProcessing ? 'Marking...' : 'Mark Picked Up (Dispatched)'}</span>
            </button>
          )}

          {laneKey === 'in_transit' && (
            <div className="space-y-2">
              {!isNearDestination ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() =>
                    handleStatusProgression(order.id, 'near_destination', {
                      locationName: order.city,
                    })
                  }
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-600" />
                  <span>Send "Rider Nearby" Alert</span>
                </button>
              ) : (
                <div className="w-full py-1 text-[11px] font-medium text-amber-900 bg-amber-100/70 border border-amber-200 rounded-lg text-center">
                  Customer notified: Rider nearby
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setPodModalOrder(order)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Mark Delivered</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setFailedModalOrder(order)}
                  className="py-2 px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition cursor-pointer"
                  title="Report Delivery Issue"
                >
                  Issue
                </button>
              </div>
            </div>
          )}

          {laneKey === 'delivered' && (
            <Link
              to={`/orders/${order.id}`}
              className="w-full flex items-center justify-center gap-1 py-1.5 px-3 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition"
            >
              <span>View Order Record</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {laneKey === 'failed' && (
            <button
              type="button"
              onClick={() => setAssignModalOrder(order)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-rose-700" />
              <span>Reschedule / Reassign Rider</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pb-12">
      {/* Kanban Dispatch Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start">
        {lanes.map((lane) => (
          <div
            key={lane.key}
            className="w-80 min-w-[310px] max-w-[340px] shrink-0 bg-slate-100/70 border border-slate-200/90 rounded-2xl p-3 space-y-3 min-h-[520px] flex flex-col"
          >
            {/* Lane Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${lane.dotColor}`} />
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono-code">
                  {lane.title}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono-code font-bold ${lane.badgeBg}`}
              >
                {lane.count}
              </span>
            </div>

            {/* Order Cards Stack */}
            <div className="space-y-3 flex-1">
              {lane.orders.length > 0 ? (
                lane.orders.map((order) => renderCard(order, lane.key))
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">{lane.emptyText}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {assignModalOrder && (
        <AssignPartnerModal
          isOpen={true}
          orderId={assignModalOrder.id}
          currentPartnerId={assignModalOrder.delivery?.delivery_partner_id}
          defaultNotes={assignModalOrder.delivery_notes}
          onClose={() => setAssignModalOrder(null)}
          onAssign={handleAssignSubmit}
        />
      )}

      {podModalOrder && (
        <ProofOfDeliveryModal
          isOpen={true}
          orderId={podModalOrder.id}
          recipientDefaultName={podModalOrder.recipient_name}
          onClose={() => setPodModalOrder(null)}
          onSubmit={handlePodSubmit}
        />
      )}

      {failedModalOrder && (
        <FailedDeliveryModal
          isOpen={true}
          orderId={failedModalOrder.id}
          onClose={() => setFailedModalOrder(null)}
          onSubmit={handleFailedSubmit}
        />
      )}
    </div>
  );
};
