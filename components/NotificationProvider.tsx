'use client';

import { useEffect, useRef } from 'react';

/**
 * Visibility-aware polling. Refetches:
 *  - on mount (if visible)
 *  - every intervalMs (only while visible)
 *  - on tab focus / visibility change to visible
 *
 * Reemplaza SSE porque SSE mantiene una conexión viva que en Vercel
 * cuenta como tiempo de CPU continuo y puede agotar la cuota.
 */
export function useAutoRefresh(refetch: () => void, intervalMs: number = 20000) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => refetchRef.current(), intervalMs);
    };
    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetchRef.current();
        start();
      } else {
        stop();
      }
    };
    const onFocus = () => refetchRef.current();

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [intervalMs]);
}

/**
 * Compat: el API viejo `useSSE(cb)` se mantiene.
 * Ahora cada poll dispara un "evento" sintético que hace refetch
 * equivalente a NUEVO_PEDIDO + PEDIDO_ACTUALIZADO.
 */
export function useSSE(onEvent: (event: { tipo: string; data: unknown }) => void) {
  const cbRef = useRef(onEvent);
  cbRef.current = onEvent;
  useAutoRefresh(() => {
    cbRef.current({ tipo: 'POLL', data: null });
    cbRef.current({ tipo: 'NUEVO_PEDIDO', data: null });
    cbRef.current({ tipo: 'PEDIDO_ACTUALIZADO', data: null });
  }, 20000);
}

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playTone(880, 0, 0.15);
    playTone(1100, 0.18, 0.15);
    playTone(1320, 0.36, 0.25);
  } catch {}
}
