import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  SoundType,
  SOUND_OPTIONS,
  playSoundEffect,
  startSoundLoop,
  stopSoundLoop,
  unlockAudioContext,
} from '../utils/audioNotification';
import { Order, RealtimeConnectionState } from '../types';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export interface NotificationSettings {
  soundEnabled: boolean;
  soundType: SoundType;
  volume: number; // 0.1 to 1.0
  repeatUntilDismissed: boolean;
  desktopNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundType: 'service_bell',
  volume: 1.0,
  repeatUntilDismissed: true, // Continuous ring until accepted or cancelled
  desktopNotifications: true,
};

const STORAGE_KEY = 'giriraj_admin_notification_settings_v2';

interface NotificationContextType {
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  playCurrentSound: () => void;
  previewSound: (type: SoundType) => void;
  activeAlert: Order | null;
  dismissAlert: () => void;
  testOrderNotification: () => void;
  requestDesktopPermission: () => Promise<boolean>;
  desktopPermissionState: NotificationPermission | 'unsupported';
  isAudioUnlocked: boolean;
  enableAudioOnGesture: () => Promise<void>;
  newOrderCountSinceOpen: number;
  resetNewOrderCount: () => void;
  realtimeStatus: RealtimeConnectionState;
  lastSyncTime: Date | null;
  reconnectRealtime: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('giriraj_admin_notification_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          soundEnabled: parsed.soundEnabled ?? true,
          soundType: parsed.soundType === 'melody' || !parsed.soundType ? 'service_bell' : parsed.soundType,
          repeatUntilDismissed: true,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved notification settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeAlert, setActiveAlert] = useState<Order | null>(null);
  const [newOrderCountSinceOpen, setNewOrderCountSinceOpen] = useState(0);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const [desktopPermissionState, setDesktopPermissionState] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Track known order IDs to prevent duplicate sound/alert triggers
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  // Setup Android high priority notification channel & request notification permission
  useEffect(() => {
    const initNotifications = async () => {
      // 1. Always attempt AudioContext unlock on startup
      try {
        await unlockAudioContext();
        setIsAudioUnlocked(true);
      } catch (e) {
        console.warn('Audio auto-unlock:', e);
      }

      // 2. Android Capacitor Notification Channel & Permissions
      if (Capacitor.isNativePlatform()) {
        try {
          // Check permissions
          const permStatus = await LocalNotifications.checkPermissions();
          if (permStatus.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display === 'granted') {
              setDesktopPermissionState('granted');
            }
          } else {
            setDesktopPermissionState('granted');
          }

          // Create / verify high-priority sound channel for Android
          await LocalNotifications.createChannel({
            id: 'smartrun_order_alerts',
            name: 'SmartRun Order Alerts',
            description: 'Instant popup notifications and audible ringing for incoming warehouse orders',
            importance: 5, // High importance (heads-up popups on screen)
            visibility: 1, // Public on lockscreen
            sound: 'beep.wav',
            vibration: true,
            lights: true,
            lightColor: '#F59E0B',
          });
        } catch (e) {
          console.warn('[LocalNotifications] Native setup error:', e);
        }
      } else if (typeof window !== 'undefined' && 'Notification' in window) {
        setDesktopPermissionState(Notification.permission);
      }
    };

    initNotifications();
  }, []);

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save notification settings:', e);
      }
      return updated;
    });
  };

  const enableAudioOnGesture = async () => {
    const ok = await unlockAudioContext();
    if (ok) {
      setIsAudioUnlocked(true);
    }
  };

  const playCurrentSound = () => {
    enableAudioOnGesture();
    playSoundEffect(settings.soundType, settings.volume);
  };

  const previewSound = (type: SoundType) => {
    enableAudioOnGesture();
    playSoundEffect(type, settings.volume);
  };

  const requestDesktopPermission = async (): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const res = await LocalNotifications.requestPermissions();
        const granted = res.display === 'granted';
        setDesktopPermissionState(granted ? 'granted' : 'denied');
        updateSettings({ desktopNotifications: granted });
        return granted;
      } catch (e) {
        console.warn('Capacitor notification permission request failed:', e);
        return false;
      }
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      setDesktopPermissionState('unsupported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setDesktopPermissionState(permission);
      const isGranted = permission === 'granted';
      updateSettings({ desktopNotifications: isGranted });
      return isGranted;
    } catch (err) {
      console.warn('Notification permission error:', err);
      return false;
    }
  };

  const dismissAlert = () => {
    stopSoundLoop();
    setActiveAlert(null);
  };

  const resetNewOrderCount = () => {
    setNewOrderCountSinceOpen(0);
  };

  const reconnectRealtime = useCallback(() => {
    setRealtimeStatus('connecting');
    setReconnectNonce((n) => n + 1);
  }, []);

  // Trigger alert workflow when a new order is received
  const triggerNewOrderAlert = useCallback(
    async (order: Order) => {
      // 1. Immediately show in-app popup modal / banner
      setActiveAlert(order);
      setNewOrderCountSinceOpen((prev) => prev + 1);
      setLastSyncTime(new Date());

      // 2. Play sound if configured - continuously ring until accepted or cancelled
      if (settings.soundEnabled) {
        await enableAudioOnGesture();
        const option = SOUND_OPTIONS.find((s) => s.id === settings.soundType);
        const interval = (option?.durationSec || 1.6) + 0.8;
        startSoundLoop(settings.soundType, settings.volume, interval);
      }

      const shortId = order.id ? `#${order.id.slice(0, 8).toUpperCase()}` : '';
      const notifTitle = `⚡ New Order Received ${shortId}`;
      const notifBody = `${order.recipient_name || 'Customer'} • ₹${order.total_amount || 0} • ${order.city || 'Express Delivery'}`;

      // 3. Android Native Push / Heads-up Popup Notification via LocalNotifications
      if (Capacitor.isNativePlatform()) {
        try {
          const numericId = Math.abs(
            order.id
              .split('')
              .reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
          ) % 100000;

          await LocalNotifications.schedule({
            notifications: [
              {
                id: numericId || Math.floor(Math.random() * 10000),
                title: notifTitle,
                body: notifBody,
                channelId: 'smartrun_order_alerts',
                smallIcon: 'ic_stat_name',
                iconColor: '#F59E0B',
                sound: 'beep.wav',
                extra: {
                  orderId: order.id,
                },
              },
            ],
          });
        } catch (err) {
          console.warn('[LocalNotifications] Schedule error on Android:', err);
        }
      }

      // 4. Desktop / Web Browser System Notification
      if (
        !Capacitor.isNativePlatform() &&
        settings.desktopNotifications &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const notification = new Notification(notifTitle, {
            body: notifBody,
            icon: '/favicon.ico',
          });
          notification.onclick = () => {
            window.focus();
            window.location.href = `/orders/${order.id}`;
          };
        } catch (err) {
          console.warn('Could not display system desktop notification:', err);
        }
      }
    },
    [settings]
  );

  // Test simulation helper
  const testOrderNotification = () => {
    const fakeOrder: Order = {
      id: 'ord-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      status: 'pending',
      recipient_name: 'Rajesh Sharma (Test Order)',
      recipient_phone: '+91 98765 43210',
      address_line1: 'Flat 402, Sai Residency, Station Road',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380001',
      total_amount: 1450,
      subtotal: 1450,
      payment_method: 'UPI Online',
      payment_status: 'paid',
      placed_at: new Date().toISOString(),
      item_count: 3,
    };

    triggerNewOrderAlert(fakeOrder);
  };

  // Initial fetch to populate known order IDs
  useEffect(() => {
    let isCancelled = false;

    const initOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .order('placed_at', { ascending: false })
          .limit(150);

        if (data && !isCancelled) {
          data.forEach((o: any) => knownOrderIdsRef.current.add(o.id));
        }
      } catch (e) {
        console.warn('Initial orders check for notification listener failed:', e);
      } finally {
        if (!isCancelled) {
          isInitializedRef.current = true;
          setLastSyncTime(new Date());
        }
      }
    };

    initOrders();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Listen for local order status changes (e.g. accepted, packed, cancelled, deleted)
  useEffect(() => {
    const handleStatusChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (
        detail &&
        (detail.status === 'packing' ||
          detail.status === 'packed' ||
          detail.status === 'cancelled' ||
          detail.status === 'deleted' ||
          detail.status === 'shipped')
      ) {
        stopSoundLoop();
        setActiveAlert((curr) => (curr?.id === detail.orderId ? null : curr));
      }
    };

    window.addEventListener('order-status-changed', handleStatusChanged);
    return () => {
      window.removeEventListener('order-status-changed', handleStatusChanged);
    };
  }, []);

  // Polling fallback to guarantee orders are detected even if WebSocket drops on Android
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        if (!isInitializedRef.current) return;

        const { data, error } = await supabase
          .from('orders')
          .select('id, recipient_name, recipient_phone, city, total_amount, item_count, status, placed_at')
          .in('status', ['pending', 'placed', 'confirmed'])
          .order('placed_at', { ascending: false })
          .limit(15);

        if (error || !data) return;

        for (const o of data) {
          if (!knownOrderIdsRef.current.has(o.id)) {
            console.log('[Polling Fallback] New pending order found:', o.id);
            knownOrderIdsRef.current.add(o.id);
            triggerNewOrderAlert(o as Order);
            break; // trigger one alert at a time
          }
        }
      } catch (err) {
        console.warn('[Polling Fallback] Check error:', err);
      }
    }, 12000); // Check every 12 seconds in background

    return () => clearInterval(pollInterval);
  }, [triggerNewOrderAlert]);

  // Supabase Realtime Subscription for incoming orders & order status changes
  useEffect(() => {
    setRealtimeStatus('connecting');

    const channel = supabase
      .channel(`realtime_orders_notifications_${reconnectNonce}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order;
          if (!newOrder || !newOrder.id) return;

          // De-duplicate: ignore if already processed
          if (knownOrderIdsRef.current.has(newOrder.id)) return;
          knownOrderIdsRef.current.add(newOrder.id);

          // Only trigger alert if initial load is done and order is pending
          if (isInitializedRef.current) {
            const st = (newOrder.status || '').toLowerCase();
            if (st === 'pending' || st === 'confirmed' || st === 'placed' || !newOrder.status) {
              console.log('[Notification] New order received in realtime:', newOrder.id);
              triggerNewOrderAlert(newOrder);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          setLastSyncTime(new Date());
          const updated = payload.new as Order;
          // If order is no longer pending (i.e. accepted or cancelled), stop alarm ring
          if (updated && updated.status !== 'pending' && updated.status !== 'confirmed') {
            stopSoundLoop();
            setActiveAlert((curr) => (curr?.id === updated.id ? null : curr));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          setLastSyncTime(new Date());
          stopSoundLoop();
          setActiveAlert((curr) => (curr?.id === payload.old?.id ? null : curr));
        }
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Channel status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
          setLastSyncTime(new Date());
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('error');
        } else if (status === 'CLOSED') {
          setRealtimeStatus('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reconnectNonce, triggerNewOrderAlert]);

  // Clean up sound on unmount
  useEffect(() => {
    return () => {
      stopSoundLoop();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        settings,
        updateSettings,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        playCurrentSound,
        previewSound,
        activeAlert,
        dismissAlert,
        testOrderNotification,
        requestDesktopPermission,
        desktopPermissionState,
        isAudioUnlocked,
        enableAudioOnGesture,
        newOrderCountSinceOpen,
        resetNewOrderCount,
        realtimeStatus,
        lastSyncTime,
        reconnectRealtime,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
