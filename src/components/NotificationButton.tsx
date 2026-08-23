import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { BellRing, Volume2, VolumeX } from 'lucide-react';

interface NotificationButtonProps {
  variant?: 'header' | 'badge' | 'full';
}

export const NotificationButton: React.FC<NotificationButtonProps> = ({ variant = 'header' }) => {
  const { settings, openSettings, enableAudioOnGesture } = useNotifications();

  const handleClick = () => {
    enableAudioOnGesture();
    openSettings();
  };

  if (variant === 'full') {
    return (
      <button
        id="notification-settings-full-btn"
        onClick={handleClick}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition active:scale-95 cursor-pointer shadow-xs ${
          settings.soundEnabled
            ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
            : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
        }`}
        title="Open Order Sound & Notification Settings"
      >
        {settings.soundEnabled ? (
          <Volume2 className="w-4 h-4 text-amber-600 animate-pulse" />
        ) : (
          <VolumeX className="w-4 h-4 text-slate-500" />
        )}
        <span className="font-bold">Sound Alert: {settings.soundEnabled ? 'ON' : 'OFF'}</span>
      </button>
    );
  }

  return (
    <button
      id="notification-settings-btn"
      onClick={handleClick}
      className={`relative flex items-center justify-center p-2 rounded-xl border transition min-h-[40px] min-w-[40px] active:scale-95 cursor-pointer ${
        settings.soundEnabled
          ? 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-500'
      }`}
      title={`Order Sound Notifications: ${settings.soundEnabled ? 'Enabled' : 'Muted'} (Click to configure sound / song)`}
    >
      {settings.soundEnabled ? (
        <>
          <BellRing className="w-4 h-4 text-amber-600" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-white"></span>
          </span>
        </>
      ) : (
        <VolumeX className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
};
