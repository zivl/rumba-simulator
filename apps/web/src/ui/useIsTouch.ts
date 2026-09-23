import { useEffect, useState } from 'react';
import { useSettingsStore } from '../game/stores/settingsStore';

const detectTouch = (): boolean =>
  typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0);

/** Touch controls are shown automatically on touch devices unless overridden in settings. */
export const useIsTouch = (): boolean => {
  const mode = useSettingsStore((s) => s.touchControls);
  const [detected, setDetected] = useState(detectTouch);
  useEffect(() => {
    const query = window.matchMedia?.('(pointer: coarse)');
    const onChange = () => setDetected(detectTouch());
    query?.addEventListener?.('change', onChange);
    const onTouch = () => setDetected(true);
    window.addEventListener('touchstart', onTouch, { once: true });
    return () => {
      query?.removeEventListener?.('change', onChange);
      window.removeEventListener('touchstart', onTouch);
    };
  }, []);
  return mode === 'on' ? true : mode === 'off' ? false : detected;
};
