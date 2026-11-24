import type { ReactNode } from 'react';
import { ReadingLayout } from '@/components/reading-layout';
import { blogSource } from '@/lib/source';

export default async function BlogLayout({ params, children }: {
  params: Promise<{ lang: string }>; children: ReactNode;
}) {
  const { lang } = await params;
  return <ReadingLayout section="blog" lang={lang} tree={blogSource.getPageTree(lang)}>{children}</ReadingLayout>;
}
