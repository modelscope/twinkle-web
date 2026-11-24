import type { ReactNode } from 'react';
import { ReadingLayout } from '@/components/reading-layout';
import { versionById } from '@/lib/source';
import { VersionSelect } from '@/components/version-select';
import { notFound } from 'next/navigation';

export default async function DocsVersionLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string; version: string }>;
  children: ReactNode;
}) {
  const { lang, version } = await params;
  const v = versionById(version);
  if (!v) notFound();

  return (
    <ReadingLayout section="docs" lang={lang} version={version}
      tree={v.source.getPageTree(lang)}
      banner={<VersionSelect current={version} lang={lang} />}>
      {children}
    </ReadingLayout>
  );
}
