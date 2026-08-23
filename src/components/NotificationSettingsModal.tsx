import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { SOUND_OPTIONS, SoundType } from '../utils/audioNotification';
import {
  Volume2,
  VolumeX,
  Music,
  BellRing,
  X,
  Play,
  Check,
  Repeat,
  Sparkles,
  Sliders,
  Monitor,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const NotificationSettingsModal: React.FC = () => {
  const {
    settings,
    updateSettings,
    isSettingsOpen,
    closeSettings,
    previewSound,
    testOrderNotification,
    requestDesktopPermission,
    desktopPermissionState,
    enableAudioOnGesture,
    isAudioUnlocked,
  } = useNotifications();

  if (!isSettingsOpen) return null;

  const handleSoundSelect = (type: SoundType) => {
    updateSettings({ soundType: type });
    previewSound(type);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    updateSettings({ volume: val });
  };

  const handleDesktopToggle = async () => {
    if (!settings.desktopNotifications) {
      const granted = await requestDesktopPermission();
      if (!granted && desktopPermissionState === 'denied') {
        alert('Desktop notifications are blocked by your browser settings. Please enable notifications in your browser URL bar.');
      }
    } else {
      updateSettings({ desktopNotifications: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs">
              <BellRing className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                Order Sound & Notification Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure audio chimes and alerts for incoming orders
              </p>
            </div>
          </div>

          <button
            onClick={closeSettings}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-200/60 transition cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Main Master Switch: Sound Alerts */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  settings.soundEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-500 border border-slate-300'
                }`}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm sm:text-base">
                  Order Sound Alert
                </div>
                <div className="text-xs text-slate-500">
                  {settings.soundEnabled
                    ? 'Plays selected tone/song when an order arrives'
                    : 'Sound alerts are currently muted'}
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={(e) => {
                  enableAudioOnGesture();
                  updateSettings({ soundEnabled: e.target.checked });
                  if (e.target.checked) {
                    previewSound(settings.soundType);
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Sound / Song Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-amber-500" />
                Choose Order Sound / Song
              </label>
              <span className="text-xs text-slate-500">Tap to sample & select</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SOUND_OPTIONS.map((option) => {
                const isSelected = settings.soundType === option.id;
                return (
                  <div
                    key={option.id}
                    onClick={() => handleSoundSelect(option.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 ring-1 ring-amber-400 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {option.name}
                        </span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        {option.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSoundSelect(option.id);
                      }}
                      className={`p-2 rounded-lg transition shrink-0 ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      title={`Play ${option.name}`}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Volume Control Slider */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <label className="font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                Alert Volume
              </label>
              <span className="font-mono font-bold text-amber-800 text-xs px-2 py-0.5 bg-amber-100 border border-amber-200 rounded">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <VolumeX className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.volume}
                onChange={handleVolumeChange}
                onMouseUp={() => previewSound(settings.soundType)}
                onTouchEnd={() => previewSound(settings.soundType)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <Volume2 className="w-4 h-4 text-amber-600 shrink-0" />
            </div>
          </div>

          {/* Additional Options: Repeat Loop & Desktop Alerts */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Advanced Notification Behavior
            </label>

            {/* Repeat Until Dismissed */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Continuous Repeat
                  </div>
                  <div className="text-xs text-slate-500">
                    Keep chiming every few seconds until someone views or dismisses the order
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.repeatUntilDismissed}
                  onChange={(e) =>
                    updateSettings({ repeatUntilDismissed: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Desktop Notifications */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Browser Desktop Notifications
                  </div>
                  <div className="text-xs text-slate-500">
                    Show system popup notifications even when working in another browser tab
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.desktopNotifications}
                  onChange={handleDesktopToggle}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Browser Audio Unlock Reminder if needed */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Tip:</span> Browsers require one click inside the tab to allow sound playback. Testing any sound below will unlock background audio for your session.
            </div>
          </div>
        </div>

        {/* Modal Footer with Test Order Notification Button */}
        <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={testOrderNotification}
            className="flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Test Sound & Live Alert</span>
          </button>

          <button
            type="button"
            onClick={closeSettings}
            className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
