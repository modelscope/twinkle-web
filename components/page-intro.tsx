import type { ReactNode } from 'react';

// 光带只出现在栏目介绍区，正文不使用持续动态背景。
export function PageIntro({ eyebrow, title, description, icon, children }: {
  eyebrow: string; title: string; description?: string; icon?: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="swift-page-intro">
      <div className="swift-soft-beams" aria-hidden="true"><i /><i /><i /></div>
      <div className="swift-page-intro-inner">
        <span className="swift-eyebrow">{icon}{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
    </section>
  );
}
