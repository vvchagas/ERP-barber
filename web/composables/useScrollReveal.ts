export function useScrollReveal() {
  function reveal(element: HTMLElement): void {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        element.dataset.revealed = "true";
        observer.disconnect();
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
  }

  return { reveal };
}
