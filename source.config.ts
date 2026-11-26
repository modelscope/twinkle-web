import { defineDocs, defineConfig } from 'fumadocs-mdx/config';

import manifest from './content-sources.json';

// 同一发布清单限制编译、搜索、导航和静态路由，不只隐藏 sidebar。
function collection(dir: string, pages: string[]) {
  const folders = [...new Set(pages.map((page) => page.split('/').slice(0, -1).join('/')))];
  return defineDocs({
    dir,
    docs: { files: pages.flatMap((page) => [`${page}.mdx`, `${page}.zh.mdx`]) },
    meta: { files: folders.map((folder) => folder ? `${folder}/meta.json` : 'meta.json') },
  });
}

export const docsV5Dev = collection(`content/docs/${manifest.release.version}`, [
  ...manifest.release.docs, ...manifest.release.twinkle,
]);
export const blog = collection('content/blog', manifest.release.blog);
export const webui = collection('content/webui', manifest.release.webui);
export const services = collection('content/services', manifest.release.services);

export default defineConfig();