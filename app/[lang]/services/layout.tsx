import type { ReactNode } from 'react';
import { ReadingLayout } from '@/components/reading-layout';
import { servicesSource } from '@/lib/source';

export default async function ServicesLayout({ params, children }: {
  params: Promise<{ lang: string }>; children: ReactNode;
}) {
  const { lang } = await params;
  return <ReadingLayout section="services" lang={lang} tree={servicesSource.getPageTree(lang)}>{children}</ReadingLayout>;
}
