import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, UserPlus, Truck, Phone, Star, Clock, MapPin, Check, Plus } from 'lucide-react';
import { DeliveryPartner } from '../types';
import { fetchDeliveryPartners } from '../services/deliveryService';

interface AssignPartnerModalProps {
  isOpen: boolean;
  orderId: string;
  currentPartnerId?: string | null;
  defaultNotes?: string | null;
  onClose: () => void;
  onAssign: (partnerId: string, estimatedMinutes: number, notes?: string) => Promise<void>;
}

export const AssignPartnerModal: React.FC<AssignPartnerModalProps> = ({
  isOpen,
  orderId,
  currentPartnerId,
  defaultNotes,
  onClose,
  onAssign,
}) => {
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(currentPartnerId || '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [notes, setNotes] = useState(defaultNotes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchDeliveryPartners()
        .then((list) => {
          setPartners(list);
          if (!selectedPartnerId && list.length > 0) {
            // Default to first active partner
            const firstActive = list.find((p) => p.is_active);
            if (firstActive) setSelectedPartnerId(firstActive.id);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartnerId) {
      alert('Please choose a delivery partner.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAssign(selectedPartnerId, estimatedMinutes, notes.trim() || undefined);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to assign delivery partner');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-cyan-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display font-semibold text-cyan-950 text-base">
                Assign Delivery Partner
              </h3>
              <p className="text-xs text-cyan-700 font-mono-code">Order #{orderId.slice(0, 8).toUpperCase()}</p>
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
          {/* Partner Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Select Fleet Rider / Partner *
            </label>
            {isLoading ? (
              <div className="py-4 text-center text-xs text-slate-400">Loading delivery partners...</div>
            ) : partners.length === 0 ? (
              <div className="py-4 px-3 text-center text-xs bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-slate-600">No delivery partners registered in fleet.</p>
                <Link
                  to="/delivery-partners"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Register Delivery Partner
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {partners.map((partner) => {
                  const isSelected = selectedPartnerId === partner.id;
                  return (
                    <div
                      key={partner.id}
                      onClick={() => partner.is_active && setSelectedPartnerId(partner.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer ${
                        !partner.is_active
                          ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : isSelected
                          ? 'bg-cyan-50/70 border-cyan-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                            isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {partner.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-xs">{partner.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono-code uppercase">
                              {partner.vehicle_type}
                            </span>
                            {!partner.is_active && (
                              <span className="text-[10px] text-rose-600 font-medium">(Offline)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {partner.phone}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {partner.rating.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Active load count */}
                      <div className="text-right">
                        <div className="text-[11px] font-mono-code text-slate-600">
                          {partner.total_completed} trips
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center text-[10px] font-bold text-cyan-700 mt-0.5">
                            <Check className="w-3 h-3 mr-0.5" /> Selected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ETA In Minutes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Estimated Delivery Time (ETA)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setEstimatedMinutes(mins)}
                  className={`py-2 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    estimatedMinutes === mins
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          {/* Special Instructions & Notes for Rider */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Rider Instructions & Gate Landmark Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Call on arrival, landmark opposite Green Park gate #2"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting || !selectedPartnerId}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-cyan-700 hover:bg-cyan-800 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <Truck className="w-4 h-4" />
              {isSubmitting ? 'Assigning...' : 'Assign & Notify Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
