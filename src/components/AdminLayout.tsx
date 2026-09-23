import React from 'react';
import { BottomNavBar } from './BottomNavBar';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Global Sound / Realtime Modals */}
      <NotificationSettingsModal />

      {/* Full-width Main Content Area (Clean layout across all screen sizes) */}
      <div className="flex-1 flex flex-col w-full">
        <main className="flex-1 p-3 sm:p-6 pt-4 sm:pt-6 pb-24 sm:pb-28 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Clean Bottom Navigation Bar across all screen sizes */}
      <BottomNavBar />
    </div>
  );
};
