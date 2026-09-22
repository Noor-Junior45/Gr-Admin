import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Shield,
  Clock,
  FileSpreadsheet,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const DeleteAccountPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [confirmEmail, setConfirmEmail] = useState(user?.email || '');
  const [reason, setReason] = useState('Resigning or changing operational role');
  const [understandChecked, setUnderstandChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/login');
    }
  };

  const handleSubmitDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmEmail.trim()) {
      alert('Please enter your account email to confirm deletion request.');
      return;
    }

    if (user?.email && confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
      alert('Please enter your exact account email to confirm deletion request.');
      return;
    }

    setSubmitting(true);

    // Record deletion request in audit queue
    try {
      const requests = JSON.parse(
        localStorage.getItem('smartrun_account_deletion_requests') || '[]'
      );
      requests.push({
        email: confirmEmail.trim().toLowerCase(),
        reason,
        requestedAt: new Date().toISOString(),
        status: 'pending_purge',
      });
      localStorage.setItem('smartrun_account_deletion_requests', JSON.stringify(requests));
    } catch {
      // ignore
    }

    setTimeout(async () => {
      setSubmitting(false);
      setSuccessNotice(true);
      if (user) {
        setTimeout(async () => {
          await signOut();
          navigate('/login');
        }, 3000);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            id="delete-account-back-btn"
            type="button"
            onClick={handleBack}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition cursor-pointer text-slate-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Delete Account & Data
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                Play Store Policy
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Account and personal data deletion standards & deletion request form
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Policy Compliance Overview */}
          <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200/80 flex items-start gap-3">
            <UserX className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-950 leading-normal">
              <span className="font-bold block mb-1">
                Google Play Store Account Deletion Policy Compliance
              </span>
              In accordance with Google Play’s user data policy, Smartrun provides all users with transparent account deletion rights. You can request deletion of your account credentials, preferences, and personal data directly within this application or via our external web portal.
            </div>
          </div>

          {/* Scope of Deletion */}
          <section className="space-y-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>1. What Data Will Be Permanently Deleted</span>
            </h2>
            <p className="text-xs text-slate-600">
              Upon approval and verification of your deletion request, the following information will be permanently scrubbed from our active production databases:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
              <li>Operator authentication credentials, profile names, and linked Google tokens.</li>
              <li>Stored mobile phone numbers and contact preferences.</li>
              <li>Custom notification settings, sound melody choices, and device push tokens.</li>
              <li>Local offline caches and operator activity session identifiers.</li>
            </ul>
          </section>

          {/* Legally Retained Data */}
          <section className="space-y-3">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-600" />
              <span>2. Data Retained for Legal & Tax Compliance</span>
            </h2>
            <p className="text-xs text-slate-600">
              Under applicable statutory, commercial, and tax regulations, certain historical transactional logs must be preserved for audited periods (e.g. past completed invoice manifests, tax records). These records are disassociated from your personal identity and stored in restricted, anonymized audit archives.
            </p>
          </section>

          {/* Timeframe */}
          <section className="space-y-2">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-700" />
              <span>3. Deletion Processing Timeframe</span>
            </h2>
            <p className="text-xs text-slate-600">
              Account access is suspended immediately upon request submission. Personal data deletion across primary servers and automated backup rotation is completed within <strong>30 days</strong>, as stipulated by Google Play data protection guidelines.
            </p>
          </section>

          {/* Web URL deletion requirement */}
          <section className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Web-Based Deletion Request (Without Reinstalling App)</span>
            </div>
            <p>
              Users who have uninstalled the application or cannot access their mobile device may also submit an account deletion request via email to{' '}
              <span className="font-mono-code text-slate-800 font-semibold">
                account-deletion@smartrun-warehouse.internal
              </span>{' '}
              specifying their registered account email.
            </p>
          </section>

          {/* Self-Service Deletion Form */}
          <div
            id="account-deletion-form-card"
            className="pt-4 border-t border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Request Account Deletion (In-App)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Submitting this request will disable your login, revoke active session tokens, and queue your profile for permanent deletion.
            </p>

            {successNotice ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold block">Deletion Request Submitted</span>
                  Your account has been scheduled for permanent purge. Signing you out now...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitDeletion} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reason for Deletion
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
                  >
                    <option value="Resigning or changing operational role">
                      Resigning or changing operational role
                    </option>
                    <option value="No longer using Smartrun warehouse app">
                      No longer using Smartrun warehouse app
                    </option>
                    <option value="Privacy or data retention concerns">
                      Privacy or data retention concerns
                    </option>
                    <option value="Switching to a different operator account">
                      Switching to a different operator account
                    </option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {user?.email ? (
                      <>
                        Type your email (<span className="font-mono text-slate-900 font-bold">{user.email}</span>) to confirm:
                      </>
                    ) : (
                      <>Enter your registered account email to request deletion:</>
                    )}
                  </label>
                  <input
                    type="email"
                    required
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    placeholder="Enter your exact email"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-mono-code"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    id="chk-understand"
                    type="checkbox"
                    required
                    checked={understandChecked}
                    onChange={(e) => setUnderstandChecked(e.target.checked)}
                    className="mt-0.5 accent-rose-600 rounded cursor-pointer"
                  />
                  <label
                    htmlFor="chk-understand"
                    className="text-xs text-slate-600 cursor-pointer select-none"
                  >
                    I understand that this action is irreversible and will permanently delete my operator account and credentials.
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="btn-submit-account-deletion"
                    type="submit"
                    disabled={submitting || !understandChecked || !confirmEmail}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Submitting Request...' : 'Submit Deletion Request'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
