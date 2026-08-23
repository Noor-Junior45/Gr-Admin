import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { formatCurrency, formatShortId } from '../utils/formatters';
import {
  BellRing,
  Volume2,
  VolumeX,
  X,
  ArrowRight,
  MapPin,
  Phone,
  Package,
  Sparkles,
} from 'lucide-react';

export const NewOrderAlertBanner: React.FC = () => {
  const { activeAlert, dismissAlert, settings } = useNotifications();
  const navigate = useNavigate();

  if (!activeAlert) return null;

  const handleOpenOrder = () => {
    const orderId = activeAlert.id;
    dismissAlert();
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-[calc(100vw-2rem)] animate-in slide-in-from-top-4 duration-300">
      <div className="bg-white border-2 border-amber-500 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-500/25 relative overflow-hidden">
        {/* Glowing accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 animate-pulse" />

        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md animate-bounce">
              <BellRing className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  New Order Received!
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono font-bold text-slate-800">{formatShortId(activeAlert.id)}</span> just arrived in the queue
              </p>
            </div>
          </div>

          <button
            onClick={dismissAlert}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Details Brief Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 mb-4">
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenOrder}
            className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 min-h-[42px]"
          >
            <span>Open & Pack Order</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={dismissAlert}
            className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition cursor-pointer min-h-[42px] flex items-center gap-1.5"
            title="Silence audio and dismiss"
          >
            {settings.soundEnabled ? (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span>Mute</span>
              </>
            ) : (
              <span>Close</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
