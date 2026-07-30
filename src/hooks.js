import { useEffect, useRef, useState } from "react";

// Smoothly animates a number toward its target value.
export function useAnimatedNumber(target, duration = 900) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef();

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (target - from) * eased;
      setDisplay(val);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    // rAF is paused in hidden tabs — guarantee we land on the target value.
    const snap = setTimeout(() => {
      setDisplay(target);
      fromRef.current = target;
    }, duration + 150);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(snap);
    };
  }, [target, duration]);

  return Math.round(display);
}
