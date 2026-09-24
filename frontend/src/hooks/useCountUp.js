import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly animates a number towards targetValue over duration ms.
 * Also tracks direction ('gain' | 'loss' | null) for 600ms flash effect.
 */
export function useCountUp(targetValue, duration = 300) {
  const numTarget = typeof targetValue === 'number' ? targetValue : parseFloat(targetValue) || 0;
  const [currentValue, setCurrentValue] = useState(numTarget);
  const [flashDirection, setFlashDirection] = useState(null); // 'gain' | 'loss' | null
  const flashTimerRef = useRef(null);
  const prevTargetRef = useRef(numTarget);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const oldTarget = prevTargetRef.current;

    if (numTarget !== oldTarget) {
      // Determine direction for 600ms color flash
      const dir = numTarget > oldTarget ? 'gain' : 'loss';
      setFlashDirection(dir);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => {
        setFlashDirection(null);
      }, 600);

      prevTargetRef.current = numTarget;

      if (prefersReducedMotion || duration <= 0) {
        setCurrentValue(numTarget);
        return;
      }

      // Tween over duration (300ms)
      const startValue = currentValue;
      const startTime = performance.now();
      let animFrameId;

      const step = (now) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out quad: 1 - (1 - progress)^2
        const ease = 1 - (1 - progress) * (1 - progress);
        const nextVal = startValue + (numTarget - startValue) * ease;
        setCurrentValue(nextVal);

        if (progress < 1) {
          animFrameId = requestAnimationFrame(step);
        } else {
          setCurrentValue(numTarget);
        }
      };

      animFrameId = requestAnimationFrame(step);

      return () => {
        if (animFrameId) cancelAnimationFrame(animFrameId);
      };
    }
  }, [numTarget, duration]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  return { value: currentValue, flashDirection };
}
