"use client";

import { useEffect, useRef, useState, RefObject, useCallback } from "react";

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseInViewReturn<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isInView: boolean;
}

/**
 * Hook to detect when an element is in the viewport
 * Uses IntersectionObserver for performance
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {},
): UseInViewReturn<T> {
  const { threshold = 0, rootMargin = "0px", triggerOnce = false } = options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      const [entry] = entries;
      const inView = entry.isIntersecting;

      if (triggerOnce && hasTriggered.current) return;

      setIsInView(inView);

      if (triggerOnce && inView) {
        hasTriggered.current = true;
        observer.unobserve(entry.target);
      }
    },
    [triggerOnce],
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleIntersect, {
      threshold,
      rootMargin,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, handleIntersect]);

  return { ref, isInView };
}
