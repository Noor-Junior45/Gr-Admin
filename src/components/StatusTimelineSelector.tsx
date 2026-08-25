import React from 'react';
import { OrderStatus } from '../types';
import {
  Clock,
  Box,
  CheckCircle2,
  Truck,
  Sparkles,
  XCircle,
  Inbox,
  ChevronRight,
  Layers,
  Activity,
} from 'lucide-react';

export interface StageStep {
  key: 'all' | OrderStatus;
  label: string;
  shortLabel: string;
  stepNumber?: number | string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  colorScheme: {
    activeBg: string;
    activeText: string;
    activeBorder: string;
    activeRing: string;
    activeBadge: string;
    inactiveDot: string;
    indicatorColor: string;
  };
}

export const WORKFLOW_STAGES: StageStep[] = [
  {
    key: 'pending',
    stepNumber: 1,
    label: 'Pending',
    shortLabel: 'Pending',
    icon: Clock,
    description: 'Awaiting confirmation & warehouse review',
    colorScheme: {
      activeBg: 'bg-amber-500',
      activeText: 'text-slate-950',
      activeBorder: 'border-amber-500',
      activeRing: 'ring-amber-500/20',
      activeBadge: 'bg-amber-600/30 text-slate-950',
      inactiveDot: 'bg-amber-500',
      indicatorColor: '#f59e0b',
    },
  },
  {
    key: 'packing',
    stepNumber: 2,
    label: 'Packing',
    shortLabel: 'Packing',
    icon: Box,
    description: 'Items being picked & bagged at warehouse',
    colorScheme: {
      activeBg: 'bg-indigo-600',
      activeText: 'text-white',
      activeBorder: 'border-indigo-600',
      activeRing: 'ring-indigo-600/20',
      activeBadge: 'bg-indigo-500 text-white',
      inactiveDot: 'bg-indigo-500',
      indicatorColor: '#4f46e5',
    },
  },
  {
    key: 'packed',
    stepNumber: 3,
    label: 'Packed / Ready',
    shortLabel: 'Packed',
    icon: CheckCircle2,
    description: 'Sealed & staged for rider assignment',
    colorScheme: {
      activeBg: 'bg-cyan-700',
      activeText: 'text-white',
      activeBorder: 'border-cyan-700',
      activeRing: 'ring-cyan-700/20',
      activeBadge: 'bg-cyan-600 text-white',
      inactiveDot: 'bg-cyan-600',
      indicatorColor: '#0e7490',
    },
  },
  {
    key: 'shipped',
    stepNumber: 4,
    label: 'Dispatched',
    shortLabel: 'Dispatched',
    icon: Truck,
    description: 'Out for delivery with assigned rider',
    colorScheme: {
      activeBg: 'bg-sky-600',
      activeText: 'text-white',
      activeBorder: 'border-sky-600',
      activeRing: 'ring-sky-600/20',
      activeBadge: 'bg-sky-500 text-white',
      inactiveDot: 'bg-sky-500',
      indicatorColor: '#0284c7',
    },
  },
  {
    key: 'delivered',
    stepNumber: 5,
    label: 'Delivered',
    shortLabel: 'Delivered',
    icon: Sparkles,
    description: 'Successfully handed over with POD',
    colorScheme: {
      activeBg: 'bg-emerald-600',
      activeText: 'text-white',
      activeBorder: 'border-emerald-600',
      activeRing: 'ring-emerald-600/20',
      activeBadge: 'bg-emerald-500 text-white',
      inactiveDot: 'bg-emerald-500',
      indicatorColor: '#059669',
    },
  },
];

export const SPECIAL_STAGES: StageStep[] = [
  {
    key: 'cancelled',
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    icon: XCircle,
    description: 'Voided, rejected, or refunded orders',
    colorScheme: {
      activeBg: 'bg-rose-600',
      activeText: 'text-white',
      activeBorder: 'border-rose-600',
      activeRing: 'ring-rose-600/20',
      activeBadge: 'bg-rose-500 text-white',
      inactiveDot: 'bg-rose-500',
      indicatorColor: '#e11d48',
    },
  },
];

interface StatusTimelineSelectorProps {
  currentStatus: 'all' | OrderStatus;
  statusCounts: {
    all: number;
    pending: number;
    packing: number;
    packed: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  onSelectStatus: (status: 'all' | OrderStatus) => void;
  totalOrdersCount: number;
}

export const StatusTimelineSelector: React.FC<StatusTimelineSelectorProps> = ({
  currentStatus,
  statusCounts,
  onSelectStatus,
  totalOrdersCount,
}) => {
  // Find current active stage info
  const activeStage =
    currentStatus === 'all'
      ? {
          key: 'all' as const,
          label: 'Complete Order Registry',
          description: 'Viewing all customer orders across all stages and milestones.',
          color: 'text-slate-800',
        }
      : currentStatus === 'cancelled'
      ? {
          key: 'cancelled' as const,
          label: 'Cancelled Orders Pipeline',
          description: 'Viewing cancelled, unfulfillable, or refunded customer orders.',
          color: 'text-rose-700',
        }
      : WORKFLOW_STAGES.find((s) => s.key === currentStatus) || {
          key: currentStatus,
          label: currentStatus,
          description: 'Filtered order state.',
          color: 'text-slate-800',
        };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      {/* Header bar of Stepper Component */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs text-slate-700">
            <Activity className="w-4 h-4 text-cyan-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 tracking-tight uppercase font-mono-code">
                Fulfillment Workflow Stepper
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/70 text-slate-700">
                Linear Lifecycle
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select any stage below to isolate orders at that specific operational milestone.
            </p>
          </div>
        </div>

        {/* Global overview tab button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectStatus('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer border ${
              currentStatus === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-900/10'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>All Orders</span>
            <span
              className={`ml-1 text-[11px] font-mono-code px-1.5 py-0.2 rounded-md ${
                currentStatus === 'all'
                  ? 'bg-slate-800 text-slate-200'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {totalOrdersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectStatus('cancelled')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer border ${
              currentStatus === 'cancelled'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-600/20'
                : 'bg-white text-rose-700 hover:bg-rose-50 border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            <span>Cancelled</span>
            <span
              className={`ml-1 text-[11px] font-mono-code px-1.5 py-0.2 rounded-md ${
                currentStatus === 'cancelled'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {statusCounts.cancelled}
            </span>
          </button>
        </div>
      </div>

      {/* Main Linear Timeline Steps Container */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isSelected = currentStatus === stage.key;
            const count = statusCounts[stage.key as keyof typeof statusCounts] || 0;
            const isLast = idx === WORKFLOW_STAGES.length - 1;

            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => onSelectStatus(stage.key)}
                className={`group relative text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${stage.colorScheme.activeBg} ${stage.colorScheme.activeText} ${stage.colorScheme.activeBorder} shadow-sm ring-2 ${stage.colorScheme.activeRing}`
                    : 'bg-slate-50/70 hover:bg-slate-100/90 text-slate-800 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Header Row: Step number indicator + Icon + Live Count */}
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono-code ${
                        isSelected
                          ? 'bg-black/20 text-current'
                          : 'bg-white border border-slate-200 text-slate-600 group-hover:border-slate-300'
                      }`}
                    >
                      {stage.stepNumber}
                    </span>
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-current' : 'text-slate-600 group-hover:text-slate-900'
                      }`}
                    />
                  </div>

                  <span
                    className={`text-[11px] font-mono-code font-bold px-2 py-0.5 rounded-md ${
                      isSelected
                        ? stage.colorScheme.activeBadge
                        : 'bg-white border border-slate-200/90 text-slate-700 group-hover:bg-slate-100'
                    }`}
                  >
                    {count} {count === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {/* Title and Short Description */}
                <div className="mt-2.5 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold tracking-tight block ${
                        isSelected ? 'text-current' : 'text-slate-900'
                      }`}
                    >
                      {stage.label}
                    </span>
                    {!isLast && !isSelected && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 hidden lg:block" />
                    )}
                  </div>
                  <p
                    className={`text-[10px] leading-tight line-clamp-1 ${
                      isSelected ? 'opacity-90 font-medium' : 'text-slate-500'
                    }`}
                  >
                    {stage.description}
                  </p>
                </div>

                {/* Status Indicator Bar at bottom of card */}
                <div
                  className={`mt-2.5 h-1 w-full rounded-full overflow-hidden ${
                    isSelected ? 'bg-black/25' : 'bg-slate-200/70'
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isSelected ? 'w-full bg-white/90' : 'w-1.5'
                    }`}
                    style={{
                      backgroundColor: !isSelected ? stage.colorScheme.indicatorColor : undefined,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Breadcrumb / Quick Banner */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 font-mono-code">
              Active Focus:
            </span>
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              {activeStage.label}
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-500 text-[11px] hidden sm:inline">
              {activeStage.description}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Showing <strong className="text-slate-800 font-mono-code">{totalOrdersCount}</strong>{' '}
            total matching items
          </div>
        </div>
      </div>
    </div>
  );
};
