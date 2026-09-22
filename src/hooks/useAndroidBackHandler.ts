import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

export function useAndroidBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let lastBackPressTime = 0;

    const backListenerPromise = CapacitorApp.addListener('backButton', () => {
      // 1. Check if an active open modal or overlay exists
      const activeModalCloseBtn = document.querySelector<HTMLButtonElement>(
        'button[data-modal-close], button[aria-label="Close"], button[aria-label="close"], [data-close-modal], button#close-dialog-btn'
      );
      if (activeModalCloseBtn) {
        activeModalCloseBtn.click();
        return;
      }

      // Check for camera scanner overlay or active modal backdrops
      const scannerCloseBtn = document.querySelector<HTMLButtonElement>('button#stop-scanner-btn');
      if (scannerCloseBtn) {
        scannerCloseBtn.click();
        return;
      }

      const modalBackdrop = document.querySelector<HTMLElement>('.fixed.inset-0.z-50 button');
      if (modalBackdrop && modalBackdrop.textContent?.includes('Cancel')) {
        modalBackdrop.click();
        return;
      }

      // 2. Check current route
      const pathname = location.pathname;
      const isRootRoute = pathname === '/' || pathname === '/orders' || pathname === '/login';

      if (!isRootRoute) {
        // If on order tabs like /packing, /ready, /dispatch, step back to /orders
        if (
          pathname === '/packing' ||
          pathname === '/ready' ||
          pathname === '/dispatch' ||
          pathname === '/dispatched'
        ) {
          navigate('/orders', { replace: true });
          return;
        }

        // If on history tab like /cancelled, step back to /delivered
        if (pathname === '/cancelled') {
          navigate('/delivered', { replace: true });
          return;
        }

        // Default back navigation
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/orders', { replace: true });
        }
        return;
      }

      // 3. If on root route, double-tap within 2s to exit app
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressTime = now;
        const toast = document.createElement('div');
        toast.textContent = 'Press back again to exit SmartRun';
        toast.className =
          'fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-slate-900/90 backdrop-blur-md text-white text-xs font-semibold rounded-full shadow-lg pointer-events-none transition-opacity duration-300';
        document.body.appendChild(toast);
        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 1700);
      }
    });

    return () => {
      backListenerPromise.then((sub) => sub.remove());
    };
  }, [navigate, location.pathname]);
}
