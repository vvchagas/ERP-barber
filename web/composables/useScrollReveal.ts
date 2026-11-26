import type { ComponentPublicInstance } from "vue";

export type ScrollDirection = "down" | "up";

export function useScrollReveal() {
  const scrollDirection = ref<ScrollDirection>("down");
  const pendingElements = new Set<HTMLElement>();
  const animationTimers = new Map<HTMLElement, number>();
  let observer: IntersectionObserver | null = null;
  let lastScrollY = 0;

  function hasReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || document.documentElement.classList.contains("senior-mode");
  }

  function clearAnimation(element: HTMLElement): void {
    const timer = animationTimers.get(element);
    if (timer !== undefined) window.clearTimeout(timer);
    animationTimers.delete(element);
    element.style.removeProperty("transition");
    element.style.removeProperty("transform");
    element.style.removeProperty("opacity");
    element.style.removeProperty("will-change");
  }

  function setVisible(element: HTMLElement): void {
    if (hasReducedMotion()) {
      clearAnimation(element);
      element.dataset.revealed = "true";
      return;
    }

    const offset = scrollDirection.value === "down" ? 28 : -28;
    element.style.transition = "none";
    element.style.willChange = "opacity, transform";
    element.style.opacity = "0";
    element.style.transform = `translateY(${offset}px)`;
    element.dataset.revealed = "true";

    requestAnimationFrame(() => {
      element.style.transition = "opacity 450ms cubic-bezier(0.22, 1, 0.36, 1), transform 450ms cubic-bezier(0.22, 1, 0.36, 1)";
      element.style.opacity = "1";
      element.style.transform = "translateY(0)";
      const timer = window.setTimeout(() => clearAnimation(element), 480);
      animationTimers.set(element, timer);
    });
  }

  function reveal(element: Element | ComponentPublicInstance | null): void {
    const target = element instanceof HTMLElement
      ? element
      : element && "$el" in element && element.$el instanceof HTMLElement
        ? element.$el
        : null;
    if (!target) return;
    pendingElements.add(target);
    if (observer) observer.observe(target);
  }

  function onScroll(): void {
    const currentScrollY = window.scrollY;
    if (currentScrollY !== lastScrollY) {
      scrollDirection.value = currentScrollY > lastScrollY ? "down" : "up";
      lastScrollY = currentScrollY;
    }
  }

  onMounted(() => {
    lastScrollY = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });

    if (typeof IntersectionObserver === "undefined") {
      for (const element of pendingElements) {
        clearAnimation(element);
        element.dataset.revealed = "true";
      }
      return;
    }

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (entry.isIntersecting) {
          setVisible(element);
        } else {
          clearAnimation(element);
          delete element.dataset.revealed;
          if (!hasReducedMotion()) {
            element.style.opacity = "0";
          }
        }
      }
    }, { threshold: 0.12 });

    for (const element of pendingElements) observer.observe(element);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("scroll", onScroll);
    observer?.disconnect();
    for (const element of pendingElements) clearAnimation(element);
    pendingElements.clear();
  });

  return { reveal, scrollDirection: readonly(scrollDirection) };
}
