import { loader } from 'fumadocs-core/source';
import { docsV5Dev, blog, webui, services } from 'fumadocs-mdx:collections/server';
import { i18n } from './i18n';

// Docs are versioned. Each version has its own content baseline and loader;
// the version id is the first URL segment after /docs/.
export const docVersions = [
  {
    id: '5.0.0.dev',
    label: '5.0.0.dev',
    note: { en: 'Development version', zh: '开发版本' },
    source: loader({
      baseUrl: '/docs/5.0.0.dev',
      i18n,
      source: docsV5Dev.toFumadocsSource(),
    }),
  },
] as const;

export type DocVersion = (typeof docVersions)[number];
export const LATEST_VERSION = docVersions[0].id;

export function versionById(id: string | undefined): DocVersion | undefined {
  return docVersions.find((v) => v.id === id);
}

export const blogSource = loader({
  baseUrl: '/blog',
  i18n,
  source: blog.toFumadocsSource(),
});

export const webuiSource = loader({
  baseUrl: '/webui',
  i18n,
  source: webui.toFumadocsSource(),
});

export const servicesSource = loader({
  baseUrl: '/services',
  i18n,
  source: services.toFumadocsSource(),
});

/** All searchable sources (docs of every version + other sections). */
export const allSources = [...docVersions.map((v) => v.source), blogSource, webuiSource, servicesSource];
