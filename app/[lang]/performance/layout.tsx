import type { ReactNode } from 'react';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';
import { SiteHeader } from '@/components/site-header';

export default async function PerfLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  return <HomeLayout {...baseOptions(lang)} slots={{ header: SiteHeader }}>{children}</HomeLayout>;
}
