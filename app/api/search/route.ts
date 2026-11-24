import { createFromSource } from 'fumadocs-core/search/server';
import { allSources, blogSource } from '@/lib/source';

// Statically exported search index: `revalidate = false` + staticGET emits a
// JSON artifact at build time; queries run in the browser (GitHub Pages has
// no runtime server).
export const revalidate = false;

// One merged view over all collections: every page keeps the URL assigned by
// its own loader, so search results link to the correct section/version.
const merged = {
  ...blogSource,
  getPages: (locale?: string) => allSources.flatMap((s) => s.getPages(locale)),
};

export const { staticGET: GET } = createFromSource(merged, {
  // Multilingual Unicode segmentation covers Chinese and English.
  language: 'multilingual',
});
