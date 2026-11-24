import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, BookOpen, Boxes, Monitor, Network, Sparkles, Terminal } from 'lucide-react';
import { PageIntro } from './page-intro';
import { Reveal } from './home/reveal';
import type { SectionKind } from './reading-layout';
import { LATEST_VERSION } from '@/lib/versions';

type Entry = { title: string; description?: string; url: string; slug: string };
const sections = {
  blog: { label: 'FIELD NOTES / ENGINEERING', icon: BookOpen, en: 'Ideas, recipes and the architecture behind training.', zh: '训练方法、实践经验与背后的架构思考。' },
  webui: { label: 'THE VISUAL WORKBENCH', icon: Monitor, en: 'From your first run to visual workflows and automated research.', zh: '从第一次训练，到可视化编排与自动化研究。' },
  services: { label: 'CODE HERE. COMPUTE ANYWHERE.', icon: Network, en: 'Connect training code to the compute and service model that fits your work.', zh: '让训练代码连接到适合你的算力与服务形态。' },
};
const artIcons = [Boxes, Terminal, Network, Sparkles, Monitor, BookOpen];

function EntryArt({ section, index, slug }: { section: string; index: number; slug: string }) {
  const Icon = artIcons[index % artIcons.length];
  return (
    <div className={`swift-entry-art swift-entry-art-${section}`} aria-hidden="true">
      <div className="swift-entry-art-grid" />
      <svg className="swift-entry-paths" viewBox="0 0 440 150" fill="none">
        <path d="M0 90H95Q115 90 130 75L150 55Q165 40 185 40H260Q280 40 295 55L315 75Q330 90 350 90H440" />
        <path d="M0 120H80Q100 120 120 100L165 55Q180 40 200 40" />
        <path d="M235 110H290Q310 110 330 130H440" />
        <circle cx="96" cy="90" r="3" /><circle cx="350" cy="90" r="3" /><circle cx="292" cy="110" r="3" />
      </svg>
      <span className="swift-entry-art-node"><Icon size={29} /></span>
      <span className="swift-entry-art-label">{slug.replaceAll('-', ' ').toUpperCase()}</span>
      <span className="swift-entry-art-mark">SWIFT / TWINKLE</span>
    </div>
  );
}

export function SectionLanding({ section, lang, title, description, entries }: {
  section: Exclude<SectionKind, 'docs'>; lang: string; title: string; description?: string; entries: Entry[];
}) {
  const zh = lang === 'zh';
  const meta = sections[section];
  const Icon = meta.icon;
  return (
    <div id="nd-page" className={`swift-section-landing swift-section-${section}`}>
      <PageIntro eyebrow={meta.label} title={title} description={description ?? (zh ? meta.zh : meta.en)} icon={<Icon size={15} />} />
      <div className="swift-container swift-section-content">
        <div className="swift-section-subheading"><span>{zh ? '探索内容' : 'EXPLORE THE COLLECTION'}</span><span>{zh ? `${entries.length} 篇指南与文章` : `${entries.length} guides & articles`}</span></div>
        <div className="swift-entry-grid">
          {entries.map((entry, i) => (
            <Reveal key={entry.url} className={`swift-entry-card ${i === 0 ? 'swift-entry-featured' : ''}`} delay={i * 45}
              style={{ '--entry-hue': ['#7b69d3', '#6389c6', '#4c9aa1', '#9973b6'][i % 4] } as CSSProperties}>
              <Link href={entry.url} className="swift-entry-card-link">
                <EntryArt section={section} index={i} slug={entry.slug} />
                <div className="swift-entry-copy">
                  <span className="swift-entry-kicker">{section === 'blog' ? 'ENGINEERING NOTE' : section === 'webui' ? 'WORKBENCH GUIDE' : 'TRAINING AS A SERVICE'}</span>
                  <h2>{entry.title}</h2>
                  <p>{entry.description ?? (zh ? '查看完整指南、配置说明与实践示例。' : 'Explore the guide, configuration and practical examples.')}</p>
                  <span className="swift-entry-cta">{zh ? '阅读内容' : 'Read the guide'}<ArrowRight size={16} /></span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
        <div className="swift-section-bottom"><span>SWIFT × TWINKLE</span><Link href={`/${lang}/docs/${LATEST_VERSION}/`}>{zh ? '查看完整文档' : 'Explore documentation'}<ArrowRight size={14} /></Link></div>
      </div>
    </div>
  );
}
