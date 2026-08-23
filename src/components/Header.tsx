import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PackageCheck, LogOut, ShieldCheck } from 'lucide-react';
import { NotificationButton } from './NotificationButton';

export const Header: React.FC = () => {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:hidden shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand / Title */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-slate-900 font-bold text-lg sm:text-xl tracking-tight hover:opacity-90 active:scale-98 transition group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs group-hover:bg-amber-400 transition">
            <PackageCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight flex items-center gap-1.5 font-bold">
              Giriraj Admin
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded">
                Warehouse
              </span>
            </span>
            <span className="text-[11px] font-normal text-slate-500 hidden sm:inline leading-none">
              Internal Order & Packing System
            </span>
          </div>
        </Link>

        {/* Right: Notification Settings, Admin email & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notification Button */}
          <NotificationButton variant="header" />

          {email && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs sm:text-sm max-w-[180px] sm:max-w-xs truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate font-mono">{email}</span>
            </div>
          )}

          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 border border-slate-200 rounded-lg transition min-h-[40px] active:scale-95 cursor-pointer"
            title="Log out of admin session"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
