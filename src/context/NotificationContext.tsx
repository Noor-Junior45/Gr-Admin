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

export interface NotificationSettings {
  soundEnabled: boolean;
  soundType: SoundType;
  volume: number; // 0.1 to 1.0
  repeatUntilDismissed: boolean;
  desktopNotifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  soundType: 'melody',
  volume: 0.85,
  repeatUntilDismissed: false,
  desktopNotifications: false,
};

const STORAGE_KEY = 'giriraj_admin_notification_settings_v1';

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
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
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
    (order: Order) => {
      setActiveAlert(order);
      setNewOrderCountSinceOpen((prev) => prev + 1);
      setLastSyncTime(new Date());

      // 1. Play sound if configured
      if (settings.soundEnabled) {
        enableAudioOnGesture();
        if (settings.repeatUntilDismissed) {
          const option = SOUND_OPTIONS.find((s) => s.id === settings.soundType);
          const interval = (option?.durationSec || 1.5) + 1.5;
          startSoundLoop(settings.soundType, settings.volume, interval);
        } else {
          playSoundEffect(settings.soundType, settings.volume);
        }
      }

      // 2. Desktop Notification
      if (
        settings.desktopNotifications &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          const shortId = order.id ? `#${order.id.slice(0, 8).toUpperCase()}` : '';
          const title = `⚡ New Order Received ${shortId}`;
          const body = `${order.recipient_name || 'Customer'} • ₹${order.total_amount || 0} • ${order.city || 'Standard Delivery'}`;
          const notification = new Notification(title, {
            body,
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
    const initOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id')
          .order('placed_at', { ascending: false })
          .limit(150);

        if (data) {
          data.forEach((o: any) => knownOrderIdsRef.current.add(o.id));
        }
      } catch (e) {
        console.warn('Initial orders check for notification listener failed:', e);
      } finally {
        isInitializedRef.current = true;
        setLastSyncTime(new Date());
      }
    };

    initOrders();
  }, []);

  // Supabase Realtime Subscription for incoming orders
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

          // Only trigger alert if initial load is done
          if (isInitializedRef.current) {
            console.log('[Notification] New order received in realtime:', newOrder.id);
            triggerNewOrderAlert(newOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          setLastSyncTime(new Date());
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
