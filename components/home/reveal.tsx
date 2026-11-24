'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

// 默认 SSR 可见；滚动渐入和轻微倾斜只增强展示卡片，不影响阅读、触摸或减少动效偏好。
export function Reveal({ children, className = '', delay = 0, style }: {
  children: ReactNode; className?: string; delay?: number; style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = motion.matches; };
    update();
    motion.addEventListener('change', update);
    if (!('IntersectionObserver' in window) || motion.matches) {
      el.classList.add('is-visible');
      return () => motion.removeEventListener('change', update);
    }
    if (el.getBoundingClientRect().top > window.innerHeight) el.dataset.reveal = 'pending';
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    observer.observe(el);
    return () => { observer.disconnect(); motion.removeEventListener('change', update); };
  }, []);

  return (
    <div ref={ref} className={`swift-reveal min-w-0 ${className}`} style={{ '--reveal-delay': `${delay}ms`, ...style } as CSSProperties}
      onPointerMove={(event) => {
        const el = event.currentTarget;
        if (reduced.current || event.pointerType !== 'mouse' || !el.matches('.swift-feature, .swift-entry-card')) return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        el.style.setProperty('--spotlight-x', `${x}px`);
        el.style.setProperty('--spotlight-y', `${y}px`);
        el.style.setProperty('--tilt-x', `${(0.5 - y / rect.height) * 1.4}deg`);
        el.style.setProperty('--tilt-y', `${(x / rect.width - 0.5) * 1.4}deg`);
      }}
      onPointerLeave={(event) => {
        event.currentTarget.style.setProperty('--tilt-x', '0deg');
        event.currentTarget.style.setProperty('--tilt-y', '0deg');
      }}>
      {children}
    </div>
  );
}
