import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { GithubIcon } from '@/components/github-icon';
import { i18n } from './i18n';
import { site } from './site';
import { LATEST_VERSION } from './versions';

export function baseOptions(locale: string): BaseLayoutProps {
  const zh = locale === 'zh';
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/images/swift-mark.png`}
            alt="SWIFT"
            width={26}
            height={26}
            className="rounded"
          />
          SWIFT
        </span>
      ),
      url: `/${locale}/`,
    },
    links: [
      { text: zh ? '文档' : 'Docs', url: `/${locale}/docs/${LATEST_VERSION}/`, active: 'nested-url' },
      { text: zh ? '技术博客' : 'Blog', url: `/${locale}/blog/`, active: 'nested-url' },
      { text: 'WebUI', url: `/${locale}/webui/`, active: 'nested-url' },
      { text: zh ? '服务化' : 'Services', url: `/${locale}/services/`, active: 'nested-url' },
      {
        type: 'icon',
        url: site.repos.swift,
        text: 'SWIFT GitHub',
        label: 'SWIFT GitHub',
        icon: <GithubIcon className="size-4" />,
        external: true,
      },
      {
        type: 'icon',
        url: site.repos.twinkle,
        text: 'Twinkle GitHub',
        label: 'Twinkle GitHub',
        icon: <GithubIcon className="size-4" />,
        external: true,
      },
    ],
    themeSwitch: { mode: 'light-dark' },
  };
}

export const uiTranslations = {
  en: { displayName: 'English' },
  zh: { displayName: '中文' },
};

export { i18n };
