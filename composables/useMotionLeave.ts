export function useMotionLeave() {
  function leave(element: HTMLElement): Promise<void> {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

    element.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-8px)" },
      ],
      { duration: 160, easing: "ease-out", fill: "forwards" },
    );

    return new Promise((resolve) => window.setTimeout(resolve, 160));
  }

  return { leave };
}
