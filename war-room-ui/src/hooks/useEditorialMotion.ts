import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-triggered Intersection Observer hook for GSAP-style editorial reveal animations.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.06,
        rootMargin: '0px 0px -24px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/**
 * Lightweight smooth parallax scroll hook for subtle float & scale transforms.
 */
export function useParallax(maxOffset = 18) {
  const [parallax, setParallax] = useState({ offsetY: 0, scale: 1 });

  useEffect(() => {
    let rafId = 0;

    const updateParallax = () => {
      const y = window.scrollY;
      const clampedY = Math.min(Math.max(y * 0.045, 0), maxOffset);
      const scale = Math.max(0.965, 1 - y * 0.000075);
      setParallax({ offsetY: clampedY, scale });
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateParallax);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, [maxOffset]);

  return parallax;
}
