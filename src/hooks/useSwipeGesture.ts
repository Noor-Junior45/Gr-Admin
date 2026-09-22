import React, { useRef, useCallback } from 'react';

export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minDistance?: number;
  maxPerpendicular?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minDistance = 50,
  maxPerpendicular = 80,
}: SwipeOptions) {
  const touchCoords = useRef<{ x: number; y: number; time: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Only handle single touch
    if (e.touches.length !== 1) return;

    // Do not intercept if user touches horizontal scroll container or text inputs
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('[data-no-swipe]') ||
        target.closest('input') ||
        target.closest('textarea'))
    ) {
      touchCoords.current = null;
      return;
    }

    touchCoords.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchCoords.current) return;
      const start = touchCoords.current;
      touchCoords.current = null;

      if (e.changedTouches.length !== 1) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - start.x;
      const deltaY = endY - start.y;
      const duration = Date.now() - start.time;

      // Ignore very slow dragging (> 650ms)
      if (duration > 650) return;

      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Must be a predominantly horizontal swipe
      if (absX >= minDistance && absY <= maxPerpendicular && absX > absY * 1.25) {
        if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        } else if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        }
      }
    },
    [minDistance, maxPerpendicular, onSwipeLeft, onSwipeRight]
  );

  return {
    onTouchStart,
    onTouchEnd,
  };
}
