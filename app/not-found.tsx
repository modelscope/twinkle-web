import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { LATEST_VERSION } from '@/lib/versions';
import { asset } from '@/lib/site';

export default function NotFound() {
  return (
    <html lang="en">
      <body className="swift-error-body swift-surface-page">
        <div className="swift-soft-beams" aria-hidden="true"><i /><i /><i /></div>
        <Link href="/en/" className="swift-error-brand"><img src={asset('/images/swift-mark.png')} alt="" width={34} height={28} />SWIFT</Link>
        <main className="swift-error-content">
          <span className="swift-eyebrow"><Compass size={15} /> A DIFFERENT PATH</span>
          <span className="swift-error-code" aria-hidden="true">404</span>
          <h1>This page is off the map.</h1>
          <p>The page may have moved. Explore the documentation, or start again from the home page.</p>
          <div className="swift-hero-actions">
            <Link href="/en/" className="swift-button swift-button-primary">Back home<ArrowRight size={16} /></Link>
            <Link href={`/en/docs/${LATEST_VERSION}/`} className="swift-button swift-button-outline">Documentation</Link>
          </div>
          <div className="swift-error-languages"><Link href="/zh/">中文首页</Link><span>·</span><Link href={`/zh/docs/${LATEST_VERSION}/`}>中文文档</Link></div>
        </main>
      </body>
    </html>
  );
}
