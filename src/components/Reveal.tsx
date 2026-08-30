'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Reveal
 *
 * Wraps children in an element that animates into view when scrolled into the
 * viewport. Uses IntersectionObserver + the `.reveal` / `.active` classes
 * defined in globals.css.
 *
 * Accessibility: the `.reveal` class sets `opacity: 0`, so a `<noscript>` style
 * is emitted in `layout.tsx` to make content visible for users without JS.
 */
interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section';
}

export default function Reveal({ children, className = '', as = 'div' }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Tag = as as 'div';
  return (
    <Tag ref={ref} className={`reveal ${className}`.trim()}>
      {children}
    </Tag>
  );
}
