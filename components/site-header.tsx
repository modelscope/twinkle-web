'use client';

import { useEffect, useRef, useState } from 'react';
import { Languages, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useHomeLayout } from 'fumadocs-ui/layouts/home';
import { LinkItem, type MainItemType, type ButtonItemType } from 'fumadocs-ui/layouts/shared';

// 保留 Fumadocs 的搜索、主题、多语言机制，只替换顶栏的排列和收纳方式。
export function SiteHeader() {
  const { slots, navItems } = useHomeLayout();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const main = navItems.filter((item): item is MainItemType | ButtonItemType =>
    item.type === undefined || item.type === 'main' || item.type === 'button');
  const icons = navItems.filter((item) => item.type === 'icon');
  const zh = pathname.startsWith('/zh');

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <header ref={ref} id="nd-nav" className="swift-header">
      <nav className="swift-header-inner" aria-label={zh ? '主导航' : 'Main navigation'}>
        {slots.navTitle && <slots.navTitle className="swift-header-brand" />}
        <div className="swift-header-links">
          {main.map((item, i) => (
            <LinkItem key={i} item={item} className="swift-nav-link">{item.text}</LinkItem>
          ))}
        </div>
        <div className="swift-header-tools">
          {slots.searchTrigger && <slots.searchTrigger.sm hideIfDisabled className="swift-header-icon" />}
          {icons.map((item, i) => item.type === 'icon' && (
            <LinkItem key={i} item={item} className="swift-header-icon" aria-label={item.label} title={item.label}>
              {item.icon}
            </LinkItem>
          ))}
          <span className="swift-header-divider" aria-hidden="true" />
          {slots.languageSelect && (
            <slots.languageSelect.root className="swift-header-icon" title={zh ? '切换语言' : 'Choose language'}>
              <Languages size={18} aria-hidden="true" />
            </slots.languageSelect.root>
          )}
          {slots.themeSwitch && <slots.themeSwitch className="swift-header-theme" />}
          <button type="button" className="swift-header-icon swift-menu-toggle" aria-expanded={open}
            aria-controls="swift-mobile-menu" aria-label={zh ? '导航菜单' : 'Navigation menu'} onClick={() => setOpen(!open)}>
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>
      {open && (
        <nav id="swift-mobile-menu" className="swift-mobile-menu" aria-label={zh ? '移动导航' : 'Mobile navigation'}>
          {main.map((item, i) => (
            <LinkItem key={i} item={item} className="swift-nav-link" onClick={() => setOpen(false)}>
              {item.text}
            </LinkItem>
          ))}
        </nav>
      )}
    </header>
  );
}
