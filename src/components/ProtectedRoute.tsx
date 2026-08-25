import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isAdmin, loading, verificationError, retryAdminCheck, logout } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfdfc] flex flex-col items-center justify-center p-4 text-[#1a1a18]">
        <Loader2 className="w-8 h-8 text-[#1a1a18] animate-spin mb-3" />
        <p className="font-mono-code text-xs uppercase tracking-widest text-[#1a1a18]/60">
          Verifying warehouse authorization...
        </p>
      </div>
    );
  }

  // If user session exists but admin check encountered a network/db error
  if (user && !isAdmin && verificationError) {
    return (
      <div className="min-h-screen bg-[#fdfdfc] flex flex-col items-center justify-center p-6 text-[#1a1a18]">
        <div className="max-w-md w-full bg-[#f2efeb] border border-[#1a1a18]/10 p-8 text-center space-y-5">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
          <div>
            <h2 className="font-serif-display text-2xl font-semibold text-[#1a1a18] tracking-tight">
              Authorization Verification Issue
            </h2>
            <p className="text-sm text-[#1a1a18]/70 mt-2 leading-relaxed">
              {verificationError}
            </p>
          </div>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => retryAdminCheck()}
              className="w-full bg-[#1a1a18] text-[#fdfdfc] py-3.5 px-4 font-mono-code text-xs uppercase tracking-wider hover:bg-[#1a1a18]/90 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Verification</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="w-full bg-transparent text-xs text-[#1a1a18]/60 underline hover:text-[#1a1a18] py-2 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
