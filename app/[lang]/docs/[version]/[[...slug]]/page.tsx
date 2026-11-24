import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findNeighbour } from 'fumadocs-core/page-tree';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/components/mdx';
import { versionById, docVersions } from '@/lib/source';
import { editOptionsFromUrl } from '@/lib/edit-url';
import { i18n } from '@/lib/i18n';

type Params = { lang: string; version: string; slug?: string[] };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { lang, version, slug } = await params;
  const v = versionById(version);
  if (!v) notFound();
  const page = v.source.getPage(slug, lang);
  if (!page) notFound();

  const MDX = page.data.body;
  const editUrl = (page.data as { editUrl?: string }).editUrl;
  const neighbours = findNeighbour(v.source.pageTree[lang], page.url);

  return (
    <DocsPage className="swift-reading-page"
      toc={page.data.toc}
      full={page.data.full}
      editOnGithub={editOptionsFromUrl(editUrl)}
      footer={{ items: neighbours }}
    >
      <div className="swift-reading-meta"><span>DOCUMENTATION</span><span>{v.label}</span></div>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(v.source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return docVersions.flatMap((v) =>
    v.source.generateParams('slug', 'locale').map((p) => ({
      version: v.id,
      slug: p.slug,
      lang: p.locale,
    })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, version, slug } = await params;
  const v = versionById(version);
  const page = v?.source.getPage(slug, lang);
  if (!page) return {};
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: {
      // Next does not apply basePath to hreflang alternates; add it manually.
      languages: Object.fromEntries(
        i18n.languages.map((l) => [
          l,
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${v!.source.getPage(slug, l)?.url ?? ''}`,
        ]),
      ),
    },
  };
}
