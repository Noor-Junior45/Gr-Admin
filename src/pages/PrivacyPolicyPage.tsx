import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Lock, Eye, Server, FileText, Mail } from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
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
            id="privacy-back-btn"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition cursor-pointer text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Privacy Policy
            </h1>
            <p className="text-[11px] text-slate-500">
              Last updated: September 2026 • Google Play Compliant
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Introduction Card */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 leading-normal">
              <span className="font-bold block mb-1">Our Commitment to Operator & Customer Privacy</span>
              Smartrun (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) takes data privacy with the utmost seriousness. This Privacy Policy details how we handle account data, operational telemetry, and customer shipping details across our warehouse fulfillment and dispatch mobile application.
            </div>
          </div>

          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>1. Information We Collect</span>
            </h2>
            <p>
              When operating the Smartrun mobile application, we collect only data strictly necessary for order packing, parcel verification, and logistics dispatch:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>
                <strong>Operator Account Data:</strong> Google Authentication credentials (email address, full name, operator ID) to verify authorization.
              </li>
              <li>
                <strong>Fulfillment Activity Telemetry:</strong> Timestamps of order acceptance, barcode scan audits, packing status changes, and dispatch logs.
              </li>
              <li>
                <strong>Rider & Logistics Information:</strong> Designated delivery partner details, vehicle type, and active delivery state.
              </li>
              <li>
                <strong>Device & Diagnostic Data:</strong> Device model, OS version, application crash logs, and network connectivity state to ensure zero-downtime operations.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>2. How We Use Collected Data</span>
            </h2>
            <p>We process collected data solely for legitimate operational fulfillment objectives:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>Facilitating rapid packing queue verification and parcel sorting.</li>
              <li>Dispatching orders to verified fleet partners and verifying delivery handoffs.</li>
              <li>Transmitting real-time customer dispatch SMS/WhatsApp notifications.</li>
              <li>Preventing unauthorized warehouse inventory access or fraudulent order tampering.</li>
            </ul>
            <p className="text-xs text-slate-500 italic">
              *We strictly do not sell, rent, or trade any operator or customer information to third-party advertisers or data brokers.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>3. Data Storage & Security Standards</span>
            </h2>
            <p>
              All communication between the Smartrun mobile application and our servers is secured using 256-bit TLS (Transport Layer Security) encryption. Application databases use industry-standard AES-256 encryption at rest, protected by strict role-based access control (RBAC).
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>4. Your Data Protection Rights</span>
            </h2>
            <p>
              In accordance with international privacy laws and Google Play User Data policies, operators have the right to inspect their stored account data, request corrections, or request deletion of their account credentials at any time.
            </p>
            <p className="text-xs text-slate-600">
              For complete account and associated data purge procedures, please see our dedicated{' '}
              <button
                type="button"
                onClick={() => navigate('/delete-account-policy')}
                className="text-emerald-700 font-semibold underline hover:text-emerald-800"
              >
                Delete Account Policy
              </button>
              .
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>5. Contact Our Privacy Officer</span>
            </h2>
            <p className="text-xs text-slate-600">
              If you have any questions or concerns regarding our privacy practices, please contact our Data Protection Team at:
            </p>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono-code text-slate-700">
              <div>Email: privacy@smartrun-warehouse.internal</div>
              <div>Entity: Smartrun Warehouse Operations Ltd.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
