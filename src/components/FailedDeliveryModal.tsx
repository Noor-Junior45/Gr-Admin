import React, { useState } from 'react';
import { X, AlertTriangle, RotateCcw, Calendar, RefreshCcw } from 'lucide-react';

interface FailedDeliveryModalProps {
  isOpen: boolean;
  orderId: string;
  onClose: () => void;
  onSubmit: (reason: string, action: 'reschedule' | 'return_to_store' | 'refund', notes?: string) => Promise<void>;
}

export const FailedDeliveryModal: React.FC<FailedDeliveryModalProps> = ({
  isOpen,
  orderId,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('Customer unavailable / phone unreachable');
  const [action, setAction] = useState<'reschedule' | 'return_to_store' | 'refund'>('reschedule');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(reason, action, notes);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to record delivery issue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const reasonsList = [
    'Customer unavailable / phone unreachable',
    'Address incomplete or incorrect',
    'Customer requested reschedule to next slot',
    'Customer refused delivery / cancelled at doorstep',
    'Access restricted / gate closed / security denial',
    'Severe weather / vehicle breakdown',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display font-semibold text-rose-950 text-base">
                Report Delivery Issue / Failure
              </h3>
              <p className="text-xs text-rose-700 font-mono-code">Order #{orderId.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Failure Reason *
            </label>
            <div className="space-y-1.5">
              {reasonsList.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    reason === r
                      ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="failure_reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Resolution Action */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Resolution & Customer Next Step *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'reschedule',
                  label: 'Reschedule Delivery',
                  desc: 'Auto-queue for next available shift',
                  icon: Calendar,
                },
                {
                  id: 'return_to_store',
                  label: 'Return to Store',
                  desc: 'Restock parcel in warehouse',
                  icon: RotateCcw,
                },
                {
                  id: 'refund',
                  label: 'Cancel & Refund',
                  desc: 'Initiate full refund to payment method',
                  icon: RefreshCcw,
                },
              ].map((act) => {
                const Icon = act.icon;
                const isSelected = action === act.id;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setAction(act.id as any)}
                    className={`flex flex-col p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 font-medium shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-700' : 'text-slate-400'}`} />
                      <span className="text-xs font-semibold">{act.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">{act.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Internal Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Rider waited 15 mins at gate, called customer 3 times with no answer"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? 'Logging Issue...' : 'Log Failure & Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
