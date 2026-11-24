import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

// One collection per docs version: only versions with a real content baseline
// get an entry. Locale suffix convention: `<name>.mdx` = English (default),
// `<name>.zh.mdx` = Chinese.
export const docsV5Dev = defineDocs({ dir: 'content/docs/5.0.0.dev' });

export const blog = defineDocs({ dir: 'content/blog' });
export const webui = defineDocs({ dir: 'content/webui' });
export const services = defineDocs({ dir: 'content/services' });

export default defineConfig();