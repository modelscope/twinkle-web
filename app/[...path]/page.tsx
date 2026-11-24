import Link from 'next/link';
import { notFound } from 'next/navigation';
import migration from '@/migration-map.json';

// Static compatibility pages for the old Hugo site URLs. GitHub Pages cannot
// do server redirects, so each old path is a real HTML page that forwards.
const routes = migration.routes as Record<string, string>;

export function generateStaticParams() {
  return Object.keys(routes).map((path) => ({ path: path.split('/') }));
}

export default async function CompatPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.join('/');
  if (!(key in routes)) notFound();
  const target = routes[key];
  const en = `/en/${target}`;
  const zh = `/zh/${target}`;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${base}${en}`} />
        <title>This page has moved</title>
      </head>
      <body className="swift-error-body swift-surface-page">
        <main className="swift-error-content">
          <span className="swift-eyebrow">SWIFT × TWINKLE</span>
          <h1>This page has moved.</h1>
          <p>The website has a new home. Continue in your preferred language.</p>
          <div className="swift-hero-actions">
            <Link href={en} className="swift-button swift-button-primary">Continue in English</Link>
            <Link href={zh} className="swift-button swift-button-outline">继续浏览中文</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
