import Lenis from "lenis";

export default defineNuxtPlugin(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) return;

  const lenis = new Lenis({
    smoothWheel: true,
    syncTouch: false,
  });

  let frameId = 0;
  const raf = (time: number) => {
    lenis.raf(time);
    frameId = window.requestAnimationFrame(raf);
  };

  frameId = window.requestAnimationFrame(raf);
});
