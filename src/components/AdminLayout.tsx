import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomNavBar } from './BottomNavBar';
import { NewOrderAlertBanner } from './NewOrderAlertBanner';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('smartrun_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('smartrun_sidebar_collapsed', String(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Global Sound / Realtime Alerts & Modals */}
      <NewOrderAlertBanner />
      <NotificationSettingsModal />

      {/* Desktop & Mobile Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />

      {/* Main Content Area (without top navbar) */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          sidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
        }`}
      >
        <main className="flex-1 p-3 sm:p-6 pt-4 sm:pt-6 pb-24 sm:pb-28 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Always Visible Bottom Navigation Bar for All Screen Sizes */}
      <BottomNavBar sidebarCollapsed={sidebarCollapsed} />
    </div>
  );
};

