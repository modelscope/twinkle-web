import type { ReactNode } from 'react';
import { ReadingLayout } from '@/components/reading-layout';
import { webuiSource } from '@/lib/source';

export default async function WebUILayout({ params, children }: {
  params: Promise<{ lang: string }>; children: ReactNode;
}) {
  const { lang } = await params;
  return <ReadingLayout section="webui" lang={lang} tree={webuiSource.getPageTree(lang)}>{children}</ReadingLayout>;
}
