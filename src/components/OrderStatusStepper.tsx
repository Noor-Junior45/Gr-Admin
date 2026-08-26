import React from 'react';
import { Order, OrderStatus, Delivery } from '../types';
import { formatDateTime, getRefundBadge } from '../utils/formatters';
import {
  Clock,
  Box,
  Truck,
  CheckCircle2,
  Sparkles,
  XCircle,
  ArrowRight,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  RotateCcw,
} from 'lucide-react';

export interface OrderStatusStepperProps {
  order: Order;
  delivery?: Delivery | null;
  onTransitionStatus: (targetStatus: OrderStatus) => Promise<void> | void;
  onRequestCancel: () => void;
  onRequestAssignRider?: () => void;
  onRequestPod?: () => void;
  isUpdating?: boolean;
}

interface StepDefinition {
  status: OrderStatus;
  label: string;
  shortLabel: string;
  stepNumber: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  nextStatus?: OrderStatus;
  nextActionLabel?: string;
  getTimestamp: (order: Order) => string | null | undefined;
  activeBg: string;
  activeText: string;
  activeBorder: string;
  activeRing: string;
  badgeActive: string;
  indicatorColor: string;
}

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    status: 'pending',
    label: 'Pending Review',
    shortLabel: 'Pending',
    stepNumber: 1,
    icon: Clock,
    description: 'Order placed & awaiting warehouse confirmation',
    nextStatus: 'packing',
    nextActionLabel: 'Accept & Start Packing',
    getTimestamp: (order) => order.placed_at,
    activeBg: 'bg-amber-500',
    activeText: 'text-slate-950',
    activeBorder: 'border-amber-500',
    activeRing: 'ring-amber-400/30',
    badgeActive: 'bg-amber-600/30 text-slate-950',
    indicatorColor: '#f59e0b',
  },
  {
    status: 'packing',
    label: 'Packing Items',
    shortLabel: 'Packing',
    stepNumber: 2,
    icon: Box,
    description: 'Items being picked, bagged & sealed',
    nextStatus: 'shipped',
    nextActionLabel: 'Mark Ready & Dispatch',
    getTimestamp: (order) => order.packed_at || (order.status !== 'pending' ? order.updated_at : null),
    activeBg: 'bg-indigo-600',
    activeText: 'text-white',
    activeBorder: 'border-indigo-600',
    activeRing: 'ring-indigo-500/30',
    badgeActive: 'bg-indigo-500 text-white',
    indicatorColor: '#4f46e5',
  },
  {
    status: 'shipped',
    label: 'Dispatched',
    shortLabel: 'Dispatched',
    stepNumber: 3,
    icon: Truck,
    description: 'Out for delivery with assigned rider',
    nextStatus: 'delivered',
    nextActionLabel: 'Confirm Delivered (POD)',
    getTimestamp: (order) => order.shipped_at,
    activeBg: 'bg-sky-600',
    activeText: 'text-white',
    activeBorder: 'border-sky-600',
    activeRing: 'ring-sky-500/30',
    badgeActive: 'bg-sky-500 text-white',
    indicatorColor: '#0284c7',
  },
  {
    status: 'delivered',
    label: 'Delivered',
    shortLabel: 'Delivered',
    stepNumber: 4,
    icon: Sparkles,
    description: 'Successfully handed over to customer',
    getTimestamp: (order) => order.delivered_at,
    activeBg: 'bg-emerald-600',
    activeText: 'text-white',
    activeBorder: 'border-emerald-600',
    activeRing: 'ring-emerald-500/30',
    badgeActive: 'bg-emerald-500 text-white',
    indicatorColor: '#059669',
  },
];

// Helper to determine the current step index (0 to 3)
function getStepIndex(status: OrderStatus): number {
  if (status === 'pending' || status === 'confirmed') return 0;
  if (status === 'packing' || status === 'packed') return 1;
  if (status === 'shipped') return 2;
  if (status === 'delivered') return 3;
  return -1;
}

export const OrderStatusStepper: React.FC<OrderStatusStepperProps> = ({
  order,
  delivery,
  onTransitionStatus,
  onRequestCancel,
  onRequestAssignRider,
  onRequestPod,
  isUpdating = false,
}) => {
  const isCancelled = order.status === 'cancelled';
  const currentStepIdx = getStepIndex(order.status);
  const currentStep = !isCancelled && currentStepIdx >= 0 ? STEP_DEFINITIONS[currentStepIdx] : null;

  // Next action calculation
  const getNextAction = () => {
    if (isCancelled || !currentStep) return null;

    if (order.status === 'pending' || order.status === 'confirmed') {
      return {
        label: 'Accept & Start Packing',
        targetStatus: 'packing' as OrderStatus,
        variant: 'primary',
        icon: Box,
      };
    }
    if (order.status === 'packing') {
      return {
        label: 'Mark Packed & Dispatch',
        targetStatus: 'shipped' as OrderStatus,
        variant: 'primary',
        icon: Truck,
      };
    }
    if (order.status === 'packed') {
      return {
        label: 'Dispatch for Delivery',
        targetStatus: 'shipped' as OrderStatus,
        variant: 'primary',
        icon: Truck,
      };
    }
    if (order.status === 'shipped') {
      return {
        label: 'Record Proof of Delivery',
        action: onRequestPod || (() => onTransitionStatus('delivered')),
        variant: 'emerald',
        icon: ShieldCheck,
      };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div
      id="order-status-stepper-container"
      className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
    >
      {/* Top Stepper Header Bar */}
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-slate-50/70 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight uppercase font-mono-code flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              Fulfillment Status Timeline
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isCancelled
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : currentStepIdx === 3
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {isCancelled
                ? 'Cancelled'
                : `Stage ${currentStepIdx + 1} of 4: ${currentStep?.label || order.status}`}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isCancelled
              ? 'This order has been flagged as cancelled and fulfillment is stopped.'
              : currentStep?.description || 'Track and advance the customer fulfillment lifecycle.'}
          </p>
        </div>

        {/* Primary Action Button Bar */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-center">
          {nextAction && !isCancelled && (
            <button
              id="btn-stepper-next-action"
              type="button"
              disabled={isUpdating}
              onClick={() => {
                if (nextAction.action) {
                  nextAction.action();
                } else if (nextAction.targetStatus) {
                  onTransitionStatus(nextAction.targetStatus);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 ${
                nextAction.variant === 'emerald'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 font-bold'
              }`}
            >
              {isUpdating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <nextAction.icon className="w-3.5 h-3.5" />
              )}
              <span>{nextAction.label}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          )}

          {!isCancelled && order.status !== 'delivered' && (
            <button
              id="btn-stepper-cancel-order"
              type="button"
              onClick={onRequestCancel}
              disabled={isUpdating}
              className="px-3 py-2 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}

          {isCancelled && (
            <button
              id="btn-stepper-reopen-order"
              type="button"
              onClick={() => onTransitionStatus('pending')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Reopen as Pending</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Stepper Timeline Body */}
      {!isCancelled ? (
        <div className="p-4 sm:p-5">
          {/* Timeline Grid on large screens, Stacked Stepper on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
            {STEP_DEFINITIONS.map((step, idx) => {
              const Icon = step.icon;
              const isPassed = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;
              const isFuture = currentStepIdx < idx;
              const timestamp = step.getTimestamp(order);
              const isLast = idx === STEP_DEFINITIONS.length - 1;

              return (
                <div
                  key={step.status}
                  className={`group relative p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                    isCurrent
                      ? `${step.activeBg} ${step.activeText} ${step.activeBorder} shadow-sm ring-2 ${step.activeRing}`
                      : isPassed
                      ? 'bg-slate-50 border-slate-200/90 text-slate-800 hover:bg-slate-100/80'
                      : 'bg-slate-50/40 border-slate-100 text-slate-400 opacity-65'
                  }`}
                >
                  {/* Top Row: Step badge / number + State icon + Status tag */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono-code transition ${
                          isCurrent
                            ? 'bg-black/20 text-current'
                            : isPassed
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.stepNumber}
                      </div>

                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isCurrent
                            ? 'text-current'
                            : isPassed
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      />
                    </div>

                    <span
                      className={`text-[10px] font-mono-code font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? step.badgeActive
                          : isPassed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border border-slate-200'
                      }`}
                    >
                      {isCurrent ? 'Current' : isPassed ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>

                  {/* Step Label & Description */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-xs font-bold tracking-tight ${
                          isCurrent ? 'text-current' : 'text-slate-900'
                        }`}
                      >
                        {step.label}
                      </h4>
                      {!isLast && !isCurrent && (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden lg:block" />
                      )}
                    </div>
                    <p
                      className={`text-[11px] leading-tight ${
                        isCurrent ? 'opacity-90 font-medium' : 'text-slate-500'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Timestamp & Milestone Footer */}
                  <div className="mt-3 pt-2.5 border-t border-black/10 flex items-center justify-between text-[11px]">
                    <span
                      className={`font-mono-code ${
                        isCurrent ? 'opacity-80' : 'text-slate-400'
                      }`}
                    >
                      {timestamp ? formatDateTime(timestamp) : 'Not reached'}
                    </span>

                    {/* Quick Direct Advance Button for past/current steps */}
                    {isCurrent && step.nextStatus && (
                      <button
                        type="button"
                        onClick={() => onTransitionStatus(step.nextStatus!)}
                        disabled={isUpdating}
                        className="text-[11px] font-bold underline hover:opacity-80 cursor-pointer"
                      >
                        Advance →
                      </button>
                    )}
                  </div>

                  {/* Visual Progress Bar at bottom */}
                  <div
                    className={`mt-2 h-1 w-full rounded-full overflow-hidden ${
                      isCurrent ? 'bg-black/20' : 'bg-slate-200'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPassed
                          ? 'w-full bg-emerald-500'
                          : isCurrent
                          ? 'w-full bg-white/90 animate-pulse'
                          : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Context Summary strip */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono-code text-[11px] uppercase">
                Active Milestone:
              </span>
              <span className="font-bold text-slate-900">{currentStep?.label}</span>
              {delivery?.delivery_partner && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-cyan-800 font-medium flex items-center gap-1">
                    <Truck className="w-3 h-3 text-cyan-600" />
                    Rider: {delivery.delivery_partner.name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStepIdx === 1 && (
                <button
                  type="button"
                  onClick={() => onTransitionStatus('shipped')}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline cursor-pointer"
                >
                  Quick Dispatch →
                </button>
              )}
              {currentStepIdx === 2 && !delivery?.delivery_partner_id && onRequestAssignRider && (
                <button
                  type="button"
                  onClick={onRequestAssignRider}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-800 underline cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Assign Rider
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Cancelled State Visual Representation */
        <div className="p-4 sm:p-5">
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <XCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-rose-900">
                    Order Cancelled & Restocked
                  </h4>
                  {order.refund_status && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        getRefundBadge(order.refund_status).pillBg
                      }`}
                    >
                      {getRefundBadge(order.refund_status).label}
                    </span>
                  )}
                </div>

                <p className="text-xs text-rose-700 leading-relaxed">
                  {order.cancel_reason || order.cancellation_reason
                    ? `Reason: "${order.cancel_reason || order.cancellation_reason}"`
                    : 'This order was cancelled and inventory items were restocked.'}
                </p>

                <div className="flex items-center gap-3 text-[11px] font-mono-code text-rose-600/90 pt-0.5 flex-wrap">
                  <span>
                    Cancelled:{' '}
                    {formatDateTime(order.cancelled_at || order.updated_at)}
                  </span>
                  {order.stock_restocked !== false && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Stock Restocked
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => onTransitionStatus('pending')}
                disabled={isUpdating}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs rounded-lg border border-slate-300 shadow-2xs transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reopen Order</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
