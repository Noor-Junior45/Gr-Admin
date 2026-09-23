import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { updateOrderStatus, cancelOrderRPC } from '../services/orderService';
import { formatCurrency, formatShortId } from '../utils/formatters';
import {
  BellRing,
  VolumeX,
  X,
  ArrowRight,
  CheckCircle2,
  Ban,
  Phone,
  MapPin,
  Package,
} from 'lucide-react';

export const NewOrderAlertBanner: React.FC = () => {
  const { activeAlert, dismissAlert, settings } = useNotifications();
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState<'accept' | 'cancel' | null>(null);

  if (!activeAlert) return null;

  const handleOpenOrder = () => {
    const orderId = activeAlert.id;
    dismissAlert();
    navigate(`/orders/${orderId}`);
  };

  const handleQuickAccept = async () => {
    if (!activeAlert?.id) return;
    setLoadingAction('accept');
    try {
      await updateOrderStatus(activeAlert.id, 'packing');
      dismissAlert();
    } catch (err: any) {
      alert(err.message || 'Failed to accept order');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickCancel = async () => {
    if (!activeAlert?.id) return;
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel order #${formatShortId(activeAlert.id)}?`
    );
    if (!confirmCancel) return;

    setLoadingAction('cancel');
    try {
      await cancelOrderRPC(activeAlert.id, 'Cancelled from alert banner');
      dismissAlert();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed top-4 sm:top-6 inset-x-3 sm:inset-x-auto sm:right-6 z-[99999] max-w-md w-auto sm:w-[26rem] mx-auto sm:mx-0 animate-in slide-in-from-top-6 duration-300 drop-shadow-2xl">
      <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(245,158,11,0.35)] relative overflow-hidden ring-4 ring-amber-500/20">
        {/* Glowing animated accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 animate-pulse" />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md animate-bounce">
              <BellRing className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base">
                  Incoming Order Alert!
                </span>
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300 animate-pulse">
                  Ringing
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-bold text-slate-800">#{formatShortId(activeAlert.id)}</span> is awaiting confirmation
              </p>
            </div>
          </div>

          <button
            onClick={dismissAlert}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Silence alarm & dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Brief Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 mb-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-900 text-base truncate">
              {activeAlert.recipient_name || 'Customer'}
            </span>
            <span className="font-mono font-extrabold text-amber-700 text-base shrink-0">
              {formatCurrency(activeAlert.total_amount)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
            {activeAlert.recipient_phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-amber-600" />
                <span className="font-mono">{activeAlert.recipient_phone}</span>
              </span>
            )}
            {activeAlert.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{activeAlert.city}</span>
              </span>
            )}
            {activeAlert.item_count !== undefined && activeAlert.item_count > 0 && (
              <span className="flex items-center gap-1 font-medium">
                <Package className="w-3 h-3 text-slate-400" />
                <span>{activeAlert.item_count} items</span>
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Buttons: Accept, Cancel, Open, Mute */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* Direct Accept Button */}
            <button
              id="btn-alert-accept"
              type="button"
              disabled={loadingAction !== null}
              onClick={handleQuickAccept}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{loadingAction === 'accept' ? 'Accepting...' : 'Accept & Pack'}</span>
            </button>

            {/* Direct Cancel Button */}
            <button
              id="btn-alert-cancel"
              type="button"
              disabled={loadingAction !== null}
              onClick={handleQuickCancel}
              className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Ban className="w-4 h-4" />
              <span>{loadingAction === 'cancel' ? 'Cancelling...' : 'Cancel Order'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Full Order Details */}
            <button
              type="button"
              onClick={handleOpenOrder}
              className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mute Button */}
            <button
              type="button"
              onClick={dismissAlert}
              className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 font-medium text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="Silence audio"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
