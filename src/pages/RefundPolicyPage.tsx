import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck, Clock, FileCheck } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            id="refund-policy-back-btn"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition cursor-pointer text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-[11px] text-slate-500">
              Warehouse fulfillment reversal and order refund operational guidelines
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-teal-700 shrink-0" />
            <div className="text-xs text-teal-950">
              <span className="font-bold block">Smartrun Order Reversals & Stock Restocking</span>
              Clear, transparent guidelines governing customer cancellations, returned packages, and restocking refunds.
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>1. Order Cancellation Windows</span>
            </h2>
            <p className="text-xs text-slate-600">
              Orders may be cancelled before physical picker handoff or courier dispatch without any processing penalty. Once an order enters the dispatched status, cancellation requires route recall verification.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-600" />
              <span>2. Warehouse Restocking & Quality Inspection</span>
            </h2>
            <p className="text-xs text-slate-600">
              Returned products undergo barcode verification and condition auditing before restock allocation. Unopened, factory-sealed goods are returned to inventory within 24 hours of warehouse return.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>3. Payment Reversals</span>
            </h2>
            <p className="text-xs text-slate-600">
              Refunds are initiated through the original payment gateway or ledger account within 3–5 business days following confirmed package check-in at the fulfillment center.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
