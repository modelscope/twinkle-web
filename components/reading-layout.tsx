'use client';

import type { CSSProperties, ReactNode } from 'react';
import { BookOpen, Newspaper, Monitor, Network, PanelLeft } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { DocsLayout, useDocsLayout } from 'fumadocs-ui/layouts/docs';
import type { Root } from 'fumadocs-core/page-tree';
import { useI18n } from 'fumadocs-ui/contexts/i18n';
import { baseOptions } from '@/lib/layout.shared';
import { SiteHeader } from './site-header';

export type SectionKind = 'docs' | 'blog' | 'webui' | 'services';
const titles = {
  docs: { en: 'Documentation', zh: '文档', icon: BookOpen },
  blog: { en: 'Engineering notes', zh: '技术博客', icon: Newspaper },
  webui: { en: 'Visual workbench', zh: '可视化工作台', icon: Monitor },
  services: { en: 'Training services', zh: '训练服务', icon: Network },
};

function ReadingToolbar() {
  const { slots } = useDocsLayout();
  const { locale } = useI18n();
  return (
    <div id="nd-subnav" className="swift-reader-toolbar">
      <slots.sidebar.trigger className="swift-reader-menu" aria-label={locale === 'zh' ? '切换文档导航' : 'Toggle documentation sidebar'}>
        <PanelLeft size={17} aria-hidden="true" />
        <span>{locale === 'zh' ? '目录导航' : 'Browse pages'}</span>
      </slots.sidebar.trigger>
      <span className="swift-reader-toolbar-note">SWIFT × TWINKLE</span>
    </div>
  );
}

// 顶栏在整个阅读布局之外，文档侧栏和目录继续使用 Fumadocs 的状态与定位机制。
export function ReadingLayout({ section, lang, tree, version, banner, children }: {
  section: SectionKind; lang: string; tree: Root; version?: string; banner?: ReactNode; children: ReactNode;
}) {
  const pathname = usePathname().replace(/\/$/, '');
  const landing = section !== 'docs' && pathname === `/${lang}/${section}`;
  const meta = titles[section];
  const Icon = meta.icon;
  const label = lang === 'zh' ? meta.zh : meta.en;
  const root = `/${lang}/${section}${section === 'docs' ? `/${version}` : ''}/`;
  return (
    <HomeLayout {...baseOptions(lang)} slots={{ header: SiteHeader }} className="swift-reading-layout">
      <DocsLayout tree={tree}
        nav={{ enabled: !landing, title: <span className="swift-sidebar-title"><Icon size={17} />{label}</span>, url: root }}
        sidebar={{ enabled: !landing, banner }}
        themeSwitch={{ enabled: false }} i18n={false}
        slots={{ header: ReadingToolbar }}
        containerProps={{ className: `swift-docs-shell ${landing ? 'swift-landing-shell' : ''}`,
          style: { '--fd-banner-height': 'var(--site-header-height)' } as CSSProperties }}>
        {children}
      </DocsLayout>
    </HomeLayout>
  );
}
