import React, { useState } from 'react';
import { X, ShieldCheck, Camera, KeyRound, UserCheck, FileSignature, Check } from 'lucide-react';
import { ProofOfDelivery } from '../types';

interface ProofOfDeliveryModalProps {
  isOpen: boolean;
  orderId: string;
  recipientDefaultName: string;
  onClose: () => void;
  onSubmit: (pod: ProofOfDelivery) => Promise<void>;
}

export const ProofOfDeliveryModal: React.FC<ProofOfDeliveryModalProps> = ({
  isOpen,
  orderId,
  recipientDefaultName,
  onClose,
  onSubmit,
}) => {
  const [method, setMethod] = useState<ProofOfDelivery['method']>('recipient_name');
  const [recipientName, setRecipientName] = useState(recipientDefaultName || '');
  const [otpCode, setOtpCode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signatureNote, setSignatureNote] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      alert('Please provide the recipient name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        method,
        recipient_name: recipientName.trim(),
        otp_code: otpCode.trim() || undefined,
        photo_url: photoUrl.trim() || undefined,
        signature_note: signatureNote.trim() || undefined,
        notes: notes.trim() || undefined,
        collected_at: new Date().toISOString(),
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to record proof of delivery');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display font-semibold text-slate-900 text-base">
                Record Proof of Delivery (POD)
              </h3>
              <p className="text-xs text-slate-500">Order #{orderId.slice(0, 8).toUpperCase()}</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Verification Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'recipient_name', label: 'Name / Recipient', icon: UserCheck },
                { id: 'otp', label: 'OTP Code', icon: KeyRound },
                { id: 'photo', label: 'Parcel Photo', icon: Camera },
                { id: 'signature', label: 'Signature Note', icon: FileSignature },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = method === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMethod(item.id as any)}
                    className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-400'}`} />
                    <span className="text-[11px] text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Received By (Recipient / Representative Name) *
            </label>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g. Customer, Security Guard, Family Member"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Conditional Method Inputs */}
          {method === 'otp' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                4 or 6-Digit Delivery OTP Code
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="e.g. 5829"
                className="w-full px-3 py-2 text-sm font-mono-code tracking-widest border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {method === 'photo' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Photo URL / Asset Key
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Attach doorbell or handed-over parcel photo proof URL.
              </p>
            </div>
          )}

          {method === 'signature' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Signature Identification Note
              </label>
              <input
                type="text"
                value={signatureNote}
                onChange={(e) => setSignatureNote(e.target.value)}
                placeholder="e.g. Signed on tablet by security officer Mr. Kumar"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          )}

          {/* Delivery Handover Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Handover Remarks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Handed over at doorstep, payment collected successfully"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Saving POD...' : 'Confirm Delivery & Mark Delivered'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
