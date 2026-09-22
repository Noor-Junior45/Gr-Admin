import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Volume2,
  Bell,
  Play,
  Check,
  Printer,
  Smartphone,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { SOUND_OPTIONS } from '../utils/audioNotification';

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

  const [popupBannerEnabled, setPopupBannerEnabled] = useState(() => {
    try {
      return localStorage.getItem('smartrun_popup_banner') !== 'false';
    } catch {
      return true;
    }
  });

  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    try {
      return localStorage.getItem('smartrun_vibration') !== 'false';
    } catch {
      return true;
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
          // ignore
        }
      }
    } catch {
      // ignore
    }
    showSaveNotice();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top App Bar - Clean without description and without star logo */}
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
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              Settings
            </h1>
          </div>

          {/* Test Alert Button without star logo */}
          <button
            id="btn-test-notification"
            type="button"
            onClick={testOrderNotification}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Test Alert</span>
          </button>
        </div>
      </div>

      {/* Main Settings Container */}
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Section 1: Sound Alerts */}
        <div
          id="setting-section-sound"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <Volume2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Sound Alerts</h2>
          </div>

          <div className="p-4 space-y-4">
            {/* Enable Sound */}
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-800 text-sm">
                Order Sound Alert
              </span>
              <button
                id="toggle-sound-enabled"
                type="button"
                onClick={() => {
                  updateSettings({ soundEnabled: !settings.soundEnabled });
                  showSaveNotice();
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.soundEnabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.soundEnabled && (
              <>
                {/* Chime Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">
                    Alert Sound
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
                              : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
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
                            title="Play Sound"
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
                    <span>Volume</span>
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

                {/* Continuous Loop */}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                  <span className="font-medium text-slate-800 text-sm">
                    Repeat Ringing
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ repeatUntilDismissed: !settings.repeatUntilDismissed });
                      showSaveNotice();
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      settings.repeatUntilDismissed ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        settings.repeatUntilDismissed ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Vibration Alert */}
                <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100">
                  <span className="font-medium text-slate-800 text-sm">
                    Vibration Alert
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleVibration(!vibrationEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      vibrationEnabled ? 'bg-amber-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                        vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Notifications */}
        <div
          id="setting-section-notifications"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Notifications</h2>
          </div>

          <div className="p-4 space-y-3.5">
            {/* In-app Notification Banner */}
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-800 text-sm">
                In-App Banner Alert
              </span>
              <button
                type="button"
                onClick={() => handleTogglePopupBanner(!popupBannerEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  popupBannerEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    popupBannerEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Desktop / Push Notification */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <span className="font-medium text-slate-800 text-sm">
                System Push Notification
              </span>
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

        {/* Section 3: Screen & View */}
        <div
          id="setting-section-screen"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Smartphone className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Screen & View</h2>
          </div>

          <div className="p-4 space-y-3.5">
            {/* Keep Screen Awake */}
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-800 text-sm">
                Keep Screen Awake
              </span>
              <button
                type="button"
                onClick={() => handleToggleWakeLock(!screenWakeLock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  screenWakeLock ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    screenWakeLock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Compact List Density */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <span className="font-medium text-slate-800 text-sm">
                Compact Orders View
              </span>
              <button
                type="button"
                onClick={() => handleToggleCompact(!compactDensity)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  compactDensity ? 'bg-teal-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    compactDensity ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Printing */}
        <div
          id="setting-section-print"
          className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden"
        >
          <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Printer className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-slate-900 text-sm">Printing</h2>
          </div>

          <div className="p-4 space-y-3.5">
            {/* Paper Format */}
            <div className="flex items-center justify-between gap-4">
              <span className="font-medium text-slate-800 text-sm">
                Packing Slip Format
              </span>
              <select
                value={printFormat}
                onChange={(e) => handleSetPrintFormat(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer"
              >
                <option value="thermal">Thermal 80mm</option>
                <option value="a4">Standard A4</option>
              </select>
            </div>

            {/* Auto Print */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100">
              <span className="font-medium text-slate-800 text-sm">
                Auto-Print on Acceptance
              </span>
              <button
                type="button"
                onClick={() => handleToggleAutoPrint(!autoPrintSlip)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoPrintSlip ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    autoPrintSlip ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Save Notice */}
      {saveToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in zoom-in-95">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>Saved</span>
        </div>
      )}
    </div>
  );
};
