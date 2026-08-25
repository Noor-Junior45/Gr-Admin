import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  MapPin,
  AlertTriangle,
  User,
  Phone,
  ShieldCheck,
  Eye,
  Radio,
  FileCheck,
  RotateCcw,
} from 'lucide-react';
import { Order, Delivery, DeliveryTrackingEvent } from '../types';
import { formatDateTime, formatTimeOnly, formatTimeElapsed } from '../utils/formatters';

interface CustomerTrackingTimelineProps {
  order: Order;
  delivery?: Delivery | null;
  events?: DeliveryTrackingEvent[];
}

export const CustomerTrackingTimeline: React.FC<CustomerTrackingTimelineProps> = ({
  order,
  delivery,
  events = [],
}) => {
  const [viewMode, setViewMode] = useState<'comparison' | 'customer_preview'>('comparison');

  const status = (order.status || '').toLowerCase();
  const deliveryStatus = (delivery?.status || '').toLowerCase();

  // Milestone check helpers
  const isConfirmed = !!order.confirmed_at || status !== 'pending';
  const isPacking = status === 'packing' || status === 'packed' || status === 'shipped' || status === 'delivered';
  const isPacked = !!order.packed_at || status === 'packed' || status === 'shipped' || status === 'delivered';
  const isAssigned = !!delivery?.delivery_partner_id || isPacked || status === 'shipped' || status === 'delivered';
  const isPickedUp = !!delivery?.picked_up_at || deliveryStatus === 'picked_up' || status === 'shipped' || status === 'delivered';
  const isOutForDelivery = !!order.shipped_at || deliveryStatus === 'out_for_delivery' || deliveryStatus === 'near_destination' || status === 'delivered';
  const isNearAddress = deliveryStatus === 'near_destination' || status === 'delivered';
  const isDelivered = status === 'delivered';
  const isFailed = status === 'failed' || deliveryStatus === 'failed';
  const isCancelled = status === 'cancelled';

  // ETA running late calculation
  const etaTimestamp = delivery?.estimated_delivery_at ? new Date(delivery.estimated_delivery_at).getTime() : null;
  const isRunningLate = etaTimestamp && !isDelivered && !isCancelled && Date.now() > etaTimestamp;

  const milestones = [
    {
      id: 'step-confirm',
      adminAction: 'Confirm order',
      customerSees: 'Order confirmed',
      description: 'Accepted by warehouse team and queued for packing',
      isCompleted: isConfirmed && !isCancelled,
      isCurrent: status === 'confirmed' || (status === 'pending' && !isCancelled),
      timestamp: order.confirmed_at || order.placed_at,
      icon: CheckCircle2,
      badgeColor: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    {
      id: 'step-packing',
      adminAction: 'Start packing',
      customerSees: 'Your items are being packed',
      description: 'Items are being picked and verified from warehouse racks',
      isCompleted: isPacking && !isCancelled,
      isCurrent: status === 'packing',
      timestamp: order.placed_at,
      icon: Package,
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    },
    {
      id: 'step-packed',
      adminAction: 'Mark packed',
      customerSees: 'Packed and ready for dispatch',
      description: 'Parcel sealed with tamper-proof security tape in dispatch bay',
      isCompleted: isPacked && !isCancelled,
      isCurrent: status === 'packed',
      timestamp: order.packed_at,
      icon: FileCheck,
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      id: 'step-assign',
      adminAction: 'Assign delivery partner',
      customerSees: delivery?.delivery_partner
        ? `Delivery Partner: ${delivery.delivery_partner.name} (${delivery.delivery_partner.phone})`
        : 'Assigning nearest delivery partner',
      description: delivery?.delivery_partner
        ? `Vehicle: ${delivery.delivery_partner.vehicle_type?.toUpperCase()} • ${delivery.delivery_partner.vehicle_number || 'Registered'}`
        : 'Searching available dispatch fleet',
      isCompleted: isAssigned && !isCancelled,
      isCurrent: deliveryStatus === 'assigned',
      timestamp: delivery?.assigned_at,
      icon: User,
      badgeColor: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    },
    {
      id: 'step-pickup',
      adminAction: 'Picked up',
      customerSees: 'Order picked up',
      description: 'Rider picked up parcel from warehouse loading dock',
      isCompleted: isPickedUp && !isCancelled,
      isCurrent: deliveryStatus === 'picked_up',
      timestamp: delivery?.picked_up_at,
      icon: Truck,
      badgeColor: 'text-sky-700 bg-sky-50 border-sky-200',
    },
    {
      id: 'step-out',
      adminAction: 'Out for delivery',
      customerSees: 'Your order is on the way',
      description: 'Rider is on transit route towards customer address',
      isCompleted: isOutForDelivery && !isCancelled,
      isCurrent: deliveryStatus === 'out_for_delivery',
      timestamp: order.shipped_at || delivery?.out_for_delivery_at,
      icon: Truck,
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    {
      id: 'step-near',
      adminAction: 'Near address',
      customerSees: 'Your delivery partner is nearby',
      description: 'Rider is within 500m / target neighborhood zone',
      isCompleted: isNearAddress && !isCancelled,
      isCurrent: deliveryStatus === 'near_destination',
      timestamp: delivery?.near_destination_at,
      icon: MapPin,
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-300',
    },
    {
      id: 'step-delivered',
      adminAction: isFailed ? 'Delivery failed / issue' : isCancelled ? 'Order cancelled' : 'Delivered',
      customerSees: isFailed
        ? `Delivery attempt failed: ${delivery?.failure_reason || 'Customer unavailable'} • Rescheduled`
        : isCancelled
        ? `Cancelled: ${order.cancellation_reason || 'Refund initiated'}`
        : 'Delivered',
      description: isDelivered
        ? `Delivered to ${delivery?.proof_of_delivery?.recipient_name || order.recipient_name} • POD Verified`
        : isFailed
        ? `Next Action: ${delivery?.failure_action === 'refund' ? 'Refund initiated' : 'Rescheduled for next slot'}`
        : isCancelled
        ? 'Restocked to inventory and customer notified'
        : 'Final delivery completion with proof of delivery',
      isCompleted: isDelivered || isFailed || isCancelled,
      isCurrent: isDelivered || isFailed || isCancelled,
      timestamp: order.delivered_at || delivery?.delivered_at,
      icon: isFailed ? AlertTriangle : isCancelled ? RotateCcw : ShieldCheck,
      badgeColor: isFailed
        ? 'text-rose-700 bg-rose-50 border-rose-200'
        : isCancelled
        ? 'text-slate-700 bg-slate-100 border-slate-300'
        : 'text-emerald-700 bg-emerald-50 border-emerald-300',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Header with Customer View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif-display font-semibold text-slate-900 text-lg">
              Live Fulfillment & Delivery Timeline
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono-code bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized mapping between Gr-Admin warehouse actions and live Gr customer app updates.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'comparison'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin vs Customer
          </button>
          <button
            type="button"
            onClick={() => setViewMode('customer_preview')}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'customer_preview'
                ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Customer App View
          </button>
        </div>
      </div>

      {/* ETA & Running Late Notification Bar */}
      {delivery?.estimated_delivery_at && !isDelivered && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-xs ${
            isRunningLate
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-amber-50/70 border-amber-200 text-amber-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 shrink-0 ${isRunningLate ? 'text-rose-600 animate-bounce' : 'text-amber-600'}`} />
            <div>
              <span className="font-semibold">Estimated Delivery Time (ETA): </span>
              <span className="font-mono-code">{formatDateTime(delivery.estimated_delivery_at)}</span>
              {isRunningLate && (
                <span className="ml-2 font-bold uppercase tracking-wide px-2 py-0.5 bg-rose-200 text-rose-900 rounded text-[10px]">
                  Running Late Alert
                </span>
              )}
            </div>
          </div>
          {delivery.delivery_partner && (
            <div className="hidden sm:flex items-center gap-2 text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{delivery.delivery_partner.phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer Preview Simulated Phone Box */}
      {viewMode === 'customer_preview' ? (
        <div className="max-w-md mx-auto bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono-code text-xs uppercase tracking-wider text-slate-400">
                Gr Customer Mobile View
              </span>
            </div>
            <span className="text-xs font-mono-code text-amber-400 font-semibold">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700/60 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">Current Status</div>
            <div className="text-base font-semibold text-white">
              {milestones.slice().reverse().find((m) => m.isCompleted)?.customerSees || 'Order placed'}
            </div>
            {delivery?.delivery_partner && (
              <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Delivery Partner</div>
                  <div className="font-medium text-slate-200">{delivery.delivery_partner.name}</div>
                </div>
                <a
                  href={`tel:${delivery.delivery_partner.phone}`}
                  className="px-2.5 py-1 bg-amber-500 text-slate-950 rounded-md font-semibold text-[11px] hover:bg-amber-400 transition"
                >
                  Call Rider
                </a>
              </div>
            )}
          </div>

          {/* Vertical Stepper in Customer App */}
          <div className="space-y-3 pt-2">
            {milestones.map((m, idx) => (
              <div key={m.id} className="flex items-start gap-3 text-xs">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.isCompleted
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : m.isCurrent
                      ? 'bg-amber-400 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {m.isCompleted ? '✓' : idx + 1}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${m.isCompleted ? 'text-white' : 'text-slate-400'}`}>
                    {m.customerSees}
                  </div>
                  {m.timestamp && m.isCompleted && (
                    <div className="text-[10px] font-mono-code text-slate-500">
                      {formatTimeOnly(m.timestamp)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Admin vs Customer Comparison Table / Vertical Stepper */
        <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
          {milestones.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.id} className="relative group">
                {/* Node Icon */}
                <div
                  className={`absolute -left-[35px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition ${
                    m.isCompleted
                      ? 'bg-emerald-600 border-white text-white shadow-xs'
                      : m.isCurrent
                      ? 'bg-amber-500 border-white text-slate-950 animate-pulse shadow-xs'
                      : 'bg-slate-100 border-slate-300 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Content Box */}
                <div
                  className={`p-4 rounded-xl border transition ${
                    m.isCurrent
                      ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                      : m.isCompleted
                      ? 'bg-slate-50/60 border-slate-200'
                      : 'bg-white border-slate-200/60 opacity-65'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono-code uppercase font-semibold text-slate-500">
                          Gr-Admin Action:
                        </span>
                        <span className="font-semibold text-slate-900 text-sm">{m.adminAction}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono-code uppercase font-semibold text-emerald-700">
                          Customer Sees in Gr:
                        </span>
                        <span className="font-semibold text-emerald-900 text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          “{m.customerSees}”
                        </span>
                      </div>
                    </div>

                    {/* Timestamp & Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {m.timestamp && (
                        <div className="text-right">
                          <div className="text-xs font-mono-code text-slate-700 font-medium">
                            {formatTimeOnly(m.timestamp)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatTimeElapsed(m.timestamp)}
                          </div>
                        </div>
                      )}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                          m.isCompleted
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : m.isCurrent
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {m.isCompleted ? 'Completed' : m.isCurrent ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2">{m.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Event History Logs */}
      {events.length > 0 && (
        <div className="pt-4 border-t border-slate-200 space-y-2">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono-code">
            Detailed Event Audit Log ({events.length} records)
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-xs border border-slate-200/80"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{evt.title}</span>
                  <span className="text-slate-500">— {evt.description}</span>
                </div>
                <div className="text-[11px] font-mono-code text-slate-400 shrink-0">
                  {formatDateTime(evt.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
