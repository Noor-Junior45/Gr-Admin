import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Bell,
  Sliders,
  Play,
  Check,
  Smartphone,
  Printer,
  Eye,
  RefreshCw,
  Sparkles,
  Shield,
  Layers,
  Zap,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { SOUND_OPTIONS, SoundType } from '../utils/audioNotification';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    previewSound,
    testOrderNotification,
    requestDesktopPermission,
    desktopPermissionState,
  } = useNotifications();

  // Additional settings stored locally
  const [popupBannerEnabled, setPopupBannerEnabled] = useState(() => {
    try {
      return localStorage.getItem('smartrun_popup_banner') !== 'false';
    } catch {
      return true;
    }
  });

  const [urgentModalEnabled, setUrgentModalEnabled] = useState(() => {
    try {
      return localStorage.getItem('smartrun_urgent_modal') === 'true';
    } catch {
      return false;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    try {
      return localStorage.getItem('smartrun_vibration') !== 'false';
    } catch {
      return true;
    }
  });

  const [refreshInterval, setRefreshInterval] = useState(() => {
    try {
      return localStorage.getItem('smartrun_refresh_interval') || 'realtime';
    } catch {
      return 'realtime';
    }
  });

  const [printFormat, setPrintFormat] = useState(() => {
    try {
      return localStorage.getItem('smartrun_print_format') || 'thermal';
    } catch {
      return 'thermal';
    }
  });

  const [autoPrintSlip, setAutoPrintSlip] = useState(() => {
    try {
      return localStorage.getItem('smartrun_auto_print') === 'true';
    } catch {
      return false;
    }
  });

  const [compactDensity, setCompactDensity] = useState(() => {
    try {
      return localStorage.getItem('smartrun_compact_density') === 'true';
    } catch {
      return false;
    }
  });

  const [screenWakeLock, setScreenWakeLock] = useState(() => {
    try {
      return localStorage.getItem('smartrun_wake_lock') === 'true';
    } catch {
      return false;
    }
  });

  const [saveToast, setSaveToast] = useState(false);

  const showSaveNotice = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleToggleVibration = (val: boolean) => {
    setVibrationEnabled(val);
    try {
      localStorage.setItem('smartrun_vibration', String(val));
      if (val && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleTogglePopupBanner = (val: boolean) => {
    setPopupBannerEnabled(val);
    try {
      localStorage.setItem('smartrun_popup_banner', String(val));
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleToggleUrgentModal = (val: boolean) => {
    setUrgentModalEnabled(val);
    try {
      localStorage.setItem('smartrun_urgent_modal', String(val));
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleSetRefreshInterval = (val: string) => {
    setRefreshInterval(val);
    try {
      localStorage.setItem('smartrun_refresh_interval', val);
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleSetPrintFormat = (val: string) => {
    setPrintFormat(val);
    try {
      localStorage.setItem('smartrun_print_format', val);
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleToggleAutoPrint = (val: boolean) => {
    setAutoPrintSlip(val);
    try {
      localStorage.setItem('smartrun_auto_print', String(val));
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleToggleCompact = (val: boolean) => {
    setCompactDensity(val);
    try {
      localStorage.setItem('smartrun_compact_density', String(val));
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  const handleToggleWakeLock = async (val: boolean) => {
    setScreenWakeLock(val);
    try {
      localStorage.setItem('smartrun_wake_lock', String(val));
      if (val && 'wakeLock' in navigator) {
        try {
          await (navigator as any).wakeLock.request('screen');
        } catch {
          // wakeLock request failed
        }
      }
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top App Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              id="settings-back-btn"
              type="button"
              onClick={() => navigate('/profile')}
              className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100 active:scale-90 transition cursor-pointer text-slate-700"
              aria-label="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Settings
              </h1>
              <p className="text-[11px] text-slate-500">
                Alert sounds, notifications & operational preferences
              </p>
            </div>
          </div>

          {/* Test Alert Simulator Button */}
          <button
            id="btn-test-notification"
            type="button"
            onClick={testOrderNotification}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Test Alert</span>
          </button>
        </div>
      </div>

      {/* Main Settings Container */}
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        {/* Section 1: Notification Sounds & Audio Alert Setting */}
        <div
          id="setting-section-sound"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Sound & Audio Alerts</h2>
              <p className="text-[11px] text-slate-500">
                Audible chimes when new orders arrive in warehouse
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Master Sound Alert Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <label className="font-semibold text-slate-800 text-sm block">
                  Enable Order Sound Alerts
                </label>
                <p className="text-xs text-slate-500">
                  Plays audio notification when a customer places an order
                </p>
              </div>
              <button
                id="toggle-sound-enabled"
                type="button"
                onClick={() => {
                  updateSettings({ soundEnabled: !settings.soundEnabled });
                  showSaveNotice();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  settings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.soundEnabled && (
              <>
                {/* Sound Chime Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Alert Chime Melody
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SOUND_OPTIONS.map((option) => {
                      const isSelected = settings.soundType === option.id;
                      return (
                        <div
                          key={option.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                            isSelected
                              ? 'bg-amber-50/70 border-amber-400 text-slate-950 font-semibold'
                              : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              updateSettings({ soundType: option.id });
                              previewSound(option.id);
                              showSaveNotice();
                            }}
                            className="flex-1 text-left text-xs cursor-pointer truncate mr-2"
                          >
                            <span>{option.name}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => previewSound(option.id)}
                            className="p-1 rounded-md hover:bg-amber-200/50 text-slate-600 hover:text-slate-950 transition cursor-pointer"
                            title="Play Preview"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Volume Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Alert Volume</span>
                    <span className="font-mono-code text-slate-500">
                      {Math.round(settings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    id="input-alert-volume"
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => {
                      updateSettings({ volume: parseFloat(e.target.value) });
                    }}
                    onMouseUp={() => previewSound(settings.soundType)}
                    onTouchEnd={() => previewSound(settings.soundType)}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Repeat Loop Option */}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">
                      Continuous Loop
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Repeat chime every 10 seconds until order is opened
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ repeatUntilDismissed: !settings.repeatUntilDismissed });
                      showSaveNotice();
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      settings.repeatUntilDismissed ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.repeatUntilDismissed ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Vibration / Haptic Feedback */}
                <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <span className="font-semibold text-slate-800 text-xs block">
                      Haptic Vibration Alert
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Vibrate phone when new order is received
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleVibration(!vibrationEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      vibrationEnabled ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        vibrationEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Pop-up & Visual Notifications Setting */}
        <div
          id="setting-section-popup"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Pop-up & Visual Notifications
              </h2>
              <p className="text-[11px] text-slate-500">
                On-screen toast banners, dialogs, and push alerts
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* In-app Floating Banner */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  In-App Pop-up Banner
                </span>
                <p className="text-xs text-slate-500">
                  Displays a top notification banner with customer name & amount
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleTogglePopupBanner(!popupBannerEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  popupBannerEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    popupBannerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Urgent Full-Screen Pop-up Modal */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Urgent Order Modal Dialog
                </span>
                <p className="text-xs text-slate-500">
                  Open a centered pop-up modal requiring acceptance when busy
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleUrgentModal(!urgentModalEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  urgentModalEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    urgentModalEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* System Push / Desktop Notification */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-semibold text-slate-800 text-sm block">
                    System Push Notifications
                  </span>
                  <p className="text-xs text-slate-500">
                    Receive background alerts even when browser tab is minimized
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      desktopPermissionState === 'granted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : desktopPermissionState === 'denied'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {desktopPermissionState}
                  </span>
                  {desktopPermissionState !== 'granted' && (
                    <button
                      type="button"
                      onClick={async () => {
                        await requestDesktopPermission();
                      }}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                    >
                      Enable
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Operational & Fulfillment Preferences */}
        <div
          id="setting-section-ops"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Fulfillment & Operations</h2>
              <p className="text-[11px] text-slate-500">
                Synchronization cadence and packing workflow options
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Auto-Refresh Cadence */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Data Sync Cadence
                </span>
                <p className="text-xs text-slate-500">
                  Order stream refresh frequency from central database
                </p>
              </div>
              <select
                value={refreshInterval}
                onChange={(e) => handleSetRefreshInterval(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="realtime">Realtime Stream</option>
                <option value="15">Every 15 Seconds</option>
                <option value="30">Every 30 Seconds</option>
                <option value="60">Every 60 Seconds</option>
              </select>
            </div>

            {/* Screen Wake Lock */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Keep Screen Awake (Wake Lock)
                </span>
                <p className="text-xs text-slate-500">
                  Prevent phone screen from sleeping during warehouse packing shift
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleWakeLock(!screenWakeLock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  screenWakeLock ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    screenWakeLock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Compact Density View */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Compact List Density
                </span>
                <p className="text-xs text-slate-500">
                  Fit more orders and packing items on smaller phone screens
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleCompact(!compactDensity)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  compactDensity ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    compactDensity ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Print & Dispatch Packing Slips */}
        <div
          id="setting-section-print"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">Packing Slip & Printing</h2>
              <p className="text-[11px] text-slate-500">
                Thermal barcode stickers and manifest options
              </p>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {/* Paper Format */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Default Slip Format
                </span>
                <p className="text-xs text-slate-500">
                  Format generated when clicking Print Packing Slip
                </p>
              </div>
              <select
                value={printFormat}
                onChange={(e) => handleSetPrintFormat(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="thermal">3-Inch Thermal (80mm)</option>
                <option value="a4">Standard A4 Sheet</option>
              </select>
            </div>

            {/* Auto Print on Acceptance */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <div>
                <span className="font-semibold text-slate-800 text-sm block">
                  Auto-Print on Order Acceptance
                </span>
                <p className="text-xs text-slate-500">
                  Automatically trigger thermal printer dialog upon accepting
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleAutoPrint(!autoPrintSlip)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoPrintSlip ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    autoPrintSlip ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: System & App Version */}
        <div className="text-center text-xs text-slate-400 py-2">
          <p className="font-mono-code font-medium">Smartrun Operations Platform v2.4.0</p>
          <p className="text-[11px] mt-0.5">Preferences are automatically synced locally</p>
        </div>
      </div>

      {/* Floating Save Notice */}
      {saveToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Settings updated successfully</span>
        </div>
      )}
    </div>
  );
};
