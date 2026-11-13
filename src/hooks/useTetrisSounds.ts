import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'tetris_sound_enabled';

export function useTetrisSounds() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {
      // ignore storage errors
    }
  }, [enabled]);

  const getContext = useCallback((): AudioContext | null => {
    if (!enabled || typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!ctxRef.current) {
      ctxRef.current = new AudioCtx();
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume();
    }
    return ctxRef.current;
  }, [enabled]);

  const playTone = useCallback(
    (freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.035) => {
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    },
    [getContext]
  );

  const playMoveSound = useCallback(() => {
    playTone(260, 0.025, 'triangle', 0.022);
  }, [playTone]);

  const playRotateSound = useCallback(() => {
    playTone(440, 0.035, 'sine', 0.03);
  }, [playTone]);

  const playHoldSound = useCallback(() => {
    playTone(360, 0.04, 'triangle', 0.032);
    setTimeout(() => playTone(510, 0.045, 'sine', 0.028), 32);
  }, [playTone]);

  const playDropSound = useCallback(() => {
    playTone(135, 0.065, 'triangle', 0.055);
  }, [playTone]);

  const playLockSound = useCallback(() => {
    playTone(180, 0.04, 'triangle', 0.032);
  }, [playTone]);

  const playClearSound = useCallback(
    (lineCount: number) => {
      if (lineCount >= 4) {
        playTone(523.25, 0.09, 'sine', 0.05);
        setTimeout(() => playTone(659.25, 0.09, 'sine', 0.05), 65);
        setTimeout(() => playTone(783.99, 0.1, 'sine', 0.05), 130);
        setTimeout(() => playTone(1046.5, 0.2, 'sine', 0.06), 195);
        return;
      }
      playTone(493.88, 0.08, 'sine', 0.045);
      if (lineCount >= 2) {
        setTimeout(() => playTone(659.25, 0.1, 'sine', 0.045), 65);
      }
      if (lineCount >= 3) {
        setTimeout(() => playTone(783.99, 0.12, 'sine', 0.05), 130);
      }
    },
    [playTone]
  );

  const playGameOverSound = useCallback(() => {
    playTone(330, 0.12, 'triangle', 0.045);
    setTimeout(() => playTone(261.63, 0.12, 'triangle', 0.04), 100);
    setTimeout(() => playTone(196, 0.22, 'triangle', 0.04), 200);
  }, [playTone]);

  const toggleSound = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    soundEnabled: enabled,
    toggleSound,
    playMoveSound,
    playRotateSound,
    playHoldSound,
    playDropSound,
    playLockSound,
    playClearSound,
    playGameOverSound,
  };
}
