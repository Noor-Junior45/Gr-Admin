import React, { useState } from 'react';
import { X, Database, Copy, Check, Terminal } from 'lucide-react';
import { getLogisticsSchemaSQL } from '../services/deliveryService';

interface SchemaMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaMigrationModal: React.FC<SchemaMigrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const sql = getLogisticsSchemaSQL();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display font-semibold text-slate-900 text-base">
                Database Schema: Logistics & Delivery Architecture
              </h3>
              <p className="text-xs text-slate-500">
                PostgreSQL DDL for <code className="font-mono-code text-amber-700 font-semibold">deliveries</code>, <code className="font-mono-code text-amber-700 font-semibold">delivery_partners</code>, and <code className="font-mono-code text-amber-700 font-semibold">delivery_tracking_events</code>.
              </p>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
            <span className="font-semibold">Relational Architecture Notice: </span>
            The warehouse system cleanly separates order entity data from delivery operations. Run the SQL script below in your <strong>Supabase SQL Editor</strong> to enable database-persisted tracking events, POD storage, and rider allocations.
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-mono-code transition cursor-pointer border border-slate-700 shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy SQL'}
            </button>

            <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl font-mono-code text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-72">
              <code>{sql}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Terminal className="w-4 h-4 text-slate-400" />
            <span>Ready for copy & execution</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg shadow-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
