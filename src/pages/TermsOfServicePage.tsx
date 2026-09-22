import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle, ShieldAlert, Award, Scale } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            id="terms-back-btn"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition cursor-pointer text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Terms of Service
            </h1>
            <p className="text-[11px] text-slate-500">
              Operational Terms & Fulfillment Conditions • Version 2.4
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Header Card */}
          <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 flex items-start gap-3">
            <Scale className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 leading-normal">
              <span className="font-bold block mb-1">Authorized Operations Agreement</span>
              By accessing and utilizing the Smartrun application, you agree to comply with all operational, security, and confidentiality obligations defined in this document.
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <span>1. Operator Eligibility & Authorized Access</span>
            </h2>
            <p>
              Smartrun is an enterprise logistics and warehouse fulfillment solution. Access is strictly granted to verified warehouse operators, pickers, packers, dispatch supervisors, and authenticated delivery partners. You may not share or transfer your Google credentials or operator account with unauthorized third parties.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              <span>2. Strict Confidentiality of Customer Information</span>
            </h2>
            <p>
              During daily order fulfillment, operators receive access to sensitive end-customer data including recipient full names, phone numbers, delivery instructions, and residential addresses:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>Customer information must be used strictly for sorting, packing, and dispatch delivery.</li>
              <li>You are strictly prohibited from copying, exporting, photographing, or publishing customer contact details outside the application.</li>
              <li>Any unauthorized disclosure of customer data will result in immediate termination of access and potential legal penalties.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-indigo-600" />
              <span>3. Order Accuracy & Fulfillment Fidelity</span>
            </h2>
            <p>
              Operators agree to follow proper inventory scanning and quality-check guidelines. Items marked as &quot;Packed&quot; or &quot;Ready&quot; must be physically verified against the order bill of materials to avoid missing goods or misrouted parcels.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>4. Service Availability & Modifications</span>
            </h2>
            <p>
              While we strive for continuous 99.9% uptime, occasional maintenance updates or network synchronization windows may occur. Smartrun reserves the right to enhance, upgrade, or modify workflow features to ensure continuous operational efficiency and compliance.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <p>
              For legal inquiries or terms clarification, please email our legal counsel at{' '}
              <span className="font-mono-code text-slate-700">legal@smartrun-warehouse.internal</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
