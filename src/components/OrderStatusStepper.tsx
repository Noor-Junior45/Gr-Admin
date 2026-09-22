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
  PackageCheck,
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
    description: 'Out for delivery with assigned rider (completed via rider app)',
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
  const isPending = order.status === 'pending' || order.status === 'confirmed';
  const currentStepIdx = getStepIndex(order.status);
  const currentStep = !isCancelled && currentStepIdx >= 0 ? STEP_DEFINITIONS[currentStepIdx] : null;

  // Next action calculation
  const getNextAction = () => {
    if (isCancelled || !currentStep) return null;

    if (isPending) {
      return {
        label: 'Accept Order',
        targetStatus: 'packing' as OrderStatus,
        variant: 'emerald',
        icon: CheckCircle2,
      };
    }
    if (order.status === 'packing') {
      return {
        label: 'Confirm Packing & Dispatch',
        targetStatus: 'shipped' as OrderStatus,
        variant: 'primary',
        icon: PackageCheck,
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
    <>
      <div
        id="order-status-stepper-container"
        className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
      >
        {/* Top Stepper Header Bar */}
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 bg-slate-50/75 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
          {/* Clean Timeline Title & Status tag */}
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-bold text-slate-900 tracking-tight uppercase font-mono-code flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              Fulfillment Status
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isCancelled
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : currentStepIdx === 3
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isCancelled ? 'Cancelled' : currentStep?.label || order.status}
            </span>
          </div>

          {/* Inline Action Buttons: Symmetrically Equal in Width & Height */}
          {nextAction && !isCancelled && order.status !== 'delivered' && (
            <div className="w-full sm:w-auto">
              {isPending ? (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                  {/* Accept Order Button */}
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
                    className="relative overflow-hidden h-9 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 border border-emerald-400/60 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_2px_5px_rgba(5,150,105,0.3)] backdrop-blur-md hover:from-emerald-400 hover:to-emerald-600 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 group/accept"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />
                    {isUpdating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin relative z-10 shrink-0" />
                    ) : (
                      <nextAction.icon className="w-3.5 h-3.5 relative z-10 shrink-0 drop-shadow-xs" />
                    )}
                    <span className="truncate drop-shadow-xs relative z-10">{nextAction.label}</span>
                  </button>

                  {/* Cancel Order Button */}
                  <button
                    id="btn-stepper-cancel-order"
                    type="button"
                    onClick={onRequestCancel}
                    disabled={isUpdating}
                    className="relative overflow-hidden h-9 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-gradient-to-b from-red-500 via-red-600 to-red-700 border border-red-400/60 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5),0_2px_5px_rgba(220,38,38,0.3)] backdrop-blur-md hover:from-red-400 hover:to-red-600 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 group/cancel"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />
                    <XCircle className="w-3.5 h-3.5 text-white/95 relative z-10 shrink-0 drop-shadow-xs" />
                    <span className="truncate drop-shadow-xs relative z-10">Cancel Order</span>
                  </button>
                </div>
              ) : (
                /* Cancel button is hidden once accepted! */
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
                  className={`relative overflow-hidden w-full sm:w-auto h-9 px-4 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold text-white shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.5)] backdrop-blur-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 ${
                    nextAction.variant === 'primary'
                      ? 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 border border-indigo-400/60 shadow-[0_2px_5px_rgba(79,70,229,0.3)] hover:from-indigo-400 hover:to-indigo-600'
                      : 'bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 border border-emerald-400/60 shadow-[0_2px_5px_rgba(5,150,105,0.3)] hover:from-emerald-400 hover:to-emerald-600'
                  }`}
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/40 via-white/10 to-transparent rounded-t-full" />
                  {isUpdating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin relative z-10 shrink-0" />
                  ) : (
                    <nextAction.icon className="w-3.5 h-3.5 relative z-10 shrink-0 drop-shadow-xs" />
                  )}
                  <span className="truncate drop-shadow-xs relative z-10">{nextAction.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-80 relative z-10 shrink-0" />
                </button>
              )}
            </div>
          )}

          {/* Cancelled State Reopen Button */}
          {isCancelled && (
            <div className="w-full sm:w-auto">
              <button
                id="btn-stepper-reopen-order"
                type="button"
                onClick={() => onTransitionStatus('pending')}
                disabled={isUpdating}
                className="relative overflow-hidden w-full sm:w-auto h-9 px-3.5 rounded-full flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/90 border border-slate-200/80 shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.85),0_2px_4px_rgba(0,0,0,0.06)] backdrop-blur-md hover:from-white hover:to-slate-200 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-[46%] bg-gradient-to-b from-white/80 via-white/20 to-transparent rounded-t-full" />
                <Clock className="w-3.5 h-3.5 text-slate-500 relative z-10 shrink-0" />
                <span className="truncate relative z-10">Reopen Order as Pending</span>
              </button>
            </div>
          )}
        </div>

        {/* Visual Stepper Timeline Body - Phone-First 2-Column Responsive Grid */}
        {!isCancelled ? (
          <div className="p-3 sm:p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 relative">
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
                    className={`group relative p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      isCurrent
                        ? `${step.activeBg} ${step.activeText} ${step.activeBorder} shadow-xs ring-2 ${step.activeRing}`
                        : isPassed
                        ? 'bg-slate-50 border-slate-200/90 text-slate-800 hover:bg-slate-100/80'
                        : 'bg-slate-50/40 border-slate-100 text-slate-400 opacity-65'
                    }`}
                  >
                    {/* Top Row: Step badge + Icon */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-bold font-mono-code transition ${
                            isCurrent
                              ? 'bg-black/20 text-current'
                              : isPassed
                              ? 'bg-slate-900 text-white'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : step.stepNumber}
                        </div>

                        <Icon
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                            isCurrent
                              ? 'text-current'
                              : isPassed
                              ? 'text-slate-700'
                              : 'text-slate-400'
                          }`}
                        />
                      </div>

                      <span
                        className={`text-[9px] sm:text-[10px] font-mono-code font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-md ${
                          isCurrent
                            ? step.badgeActive
                            : isPassed
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Active' : isPassed ? 'Done' : 'Next'}
                      </span>
                    </div>

                    {/* Step Label & Description */}
                    <div className="mt-2 sm:mt-3 space-y-0.5 sm:space-y-1">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs font-bold tracking-tight truncate ${
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
                        className={`text-[10px] sm:text-[11px] leading-snug line-clamp-2 ${
                          isCurrent ? 'opacity-90 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {step.description}
                      </p>
                    </div>

                    {/* Timestamp & Milestone Footer */}
                    <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2.5 border-t border-black/10 flex items-center justify-between text-[10px] sm:text-[11px]">
                      <span
                        className={`font-mono-code truncate ${
                          isCurrent ? 'opacity-80' : 'text-slate-400'
                        }`}
                      >
                        {timestamp ? formatDateTime(timestamp) : 'Not reached'}
                      </span>

                      {/* Quick Direct Advance Button */}
                      {isCurrent && step.nextStatus && (
                        <button
                          type="button"
                          onClick={() => onTransitionStatus(step.nextStatus!)}
                          disabled={isUpdating}
                          className="text-[10px] sm:text-[11px] font-bold underline hover:opacity-80 cursor-pointer shrink-0 ml-1"
                        >
                          Advance →
                        </button>
                      )}
                    </div>

                    {/* Visual Progress Bar at bottom */}
                    <div
                      className={`mt-1.5 sm:mt-2 h-1 w-full rounded-full overflow-hidden ${
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
              <div className="flex items-center gap-2 flex-wrap">
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
                    className="relative overflow-hidden px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-gradient-to-b from-indigo-50/95 via-indigo-100/90 to-indigo-200/80 border border-indigo-200/80 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md hover:from-indigo-50 hover:to-indigo-200 transition cursor-pointer active:scale-[0.96]"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 to-transparent rounded-t-full" />
                    <span className="relative z-10">Quick Dispatch →</span>
                  </button>
                )}
                {currentStepIdx === 2 && !delivery?.delivery_partner_id && onRequestAssignRider && (
                  <button
                    type="button"
                    onClick={onRequestAssignRider}
                    className="relative overflow-hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-cyan-800 bg-gradient-to-b from-cyan-50/95 via-cyan-100/90 to-cyan-200/80 border border-cyan-200/80 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] backdrop-blur-md hover:from-cyan-50 hover:to-cyan-200 transition cursor-pointer active:scale-[0.96]"
                  >
                    <span className="pointer-events-none absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/80 to-transparent rounded-t-full" />
                    <UserPlus className="w-3.5 h-3.5 relative z-10" />
                    <span className="relative z-10">Assign Rider</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Cancelled State Visual Representation */
          <div className="p-3 sm:p-5">
            <div className="p-3.5 sm:p-4 bg-rose-50/70 border border-rose-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                  <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
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
    </>
  );
};
