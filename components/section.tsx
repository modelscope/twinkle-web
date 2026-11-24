import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { getMDXComponents } from '@/components/mdx';
import type { blogSource } from '@/lib/source';
import { editOptionsFromUrl } from '@/lib/edit-url';
import { findNeighbour, flattenTree } from 'fumadocs-core/page-tree';
import { SectionLanding } from './section-landing';
import type { SectionKind } from './reading-layout';

// All section collections share the same defineDocs schema, so one concrete
// loader type describes them all (a bare ReturnType<typeof loader> loses it).
type Source = typeof blogSource;
type Params = { lang: string; slug?: string[] };

// Shared renderer for the blog / webui / services sections: same reading
// layout as docs, without the version dimension.
export async function SectionPage({ source, section, params }: {
  source: Source; section: Exclude<SectionKind, 'docs'>; params: Promise<Params>;
}) {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  if (!slug?.length) {
    const entries = flattenTree(source.getPageTree(lang).children).flatMap((node) => {
      const child = source.getPageByUrl(node.url, lang);
      if (!child || !child.slugs.length) return [];
      return [{ title: child.data.title, description: child.data.description, url: child.url, slug: child.slugs.join('/') }];
    });
    return <SectionLanding section={section} lang={lang} title={page.data.title} description={page.data.description} entries={entries} />;
  }
  const MDX = page.data.body;
  const editUrl = (page.data as { editUrl?: string }).editUrl;

  return (
    <DocsPage className="swift-reading-page" toc={page.data.toc} full={page.data.full}
      editOnGithub={editOptionsFromUrl(editUrl)} footer={{ items: findNeighbour(source.getPageTree(lang), page.url) }}>
      <div className="swift-reading-meta"><span>{section.toUpperCase()}</span><span>SWIFT × TWINKLE</span></div>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export function sectionStaticParams(source: Source) {
  return source.generateParams('slug', 'locale').map((p) => ({ slug: p.slug, lang: p.locale }));
}

export async function sectionMetadata(source: Source, params: Promise<Params>): Promise<Metadata> {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) return {};
  return { title: page.data.title, description: page.data.description };
}
