import { createMDX } from 'fumadocs-mdx/next';

// GitHub Pages serves the site under /twinkle-web; local dev uses no prefix.
// Set SITE_BASE_PATH=/twinkle-web for the production build (CI does this).
const basePath = process.env.SITE_BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  reactStrictMode: true,
};

export default createMDX()(config);