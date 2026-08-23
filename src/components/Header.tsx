import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PackageCheck, LogOut, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 print:hidden shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Left: Brand / Title */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-white font-bold text-lg sm:text-xl tracking-tight hover:opacity-90 active:scale-98 transition group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shadow-sm group-hover:bg-amber-400 transition">
            <PackageCheck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight flex items-center gap-1.5 font-bold">
              Giriraj Admin
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                Warehouse
              </span>
            </span>
            <span className="text-[11px] font-normal text-slate-400 hidden sm:inline leading-none">
              Internal Order & Packing System
            </span>
          </div>
        </Link>

        {/* Right: Admin email & Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          {email && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 border border-slate-700 text-slate-300 text-xs sm:text-sm max-w-[180px] sm:max-w-xs truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono">{email}</span>
            </div>
          )}

          <button
            id="admin-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-300 bg-slate-800 hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/40 border border-slate-700 rounded-lg transition min-h-[40px] active:scale-95 cursor-pointer"
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
