import Link from 'next/link';

// Static entry point: GitHub Pages has no server-side redirects, so the root
// page is a real HTML page that forwards to the default locale (English).
export default function RootPage() {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="refresh" content={`0; url=${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/en/`} />
        <title>SWIFT</title>
      </head>
      <body className="swift-error-body swift-surface-page">
        <main className="swift-error-content">
          <span className="swift-eyebrow">SWIFT × TWINKLE</span>
          <h1>Your code. Any scale.</h1>
          <div className="swift-hero-actions">
            <Link href="/en/" className="swift-button swift-button-primary">Continue in English</Link>
            <Link href="/zh/" className="swift-button swift-button-outline">中文首页</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
