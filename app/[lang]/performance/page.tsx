import type { Metadata } from 'next';
import { Fingerprint, Layers, ShieldCheck, GitBranch } from 'lucide-react';
import { PerfReport, type PerfData } from '@/components/perf-report';
import { PageIntro } from '@/components/page-intro';
import perf from '@/content/perf.json';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: lang === 'zh' ? '性能测试与曲线回归' : 'Performance & Regression',
    description: 'v4 / v5-ray / v5-remote speed comparison and training-curve regression.' };
}

export default async function PerformancePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const zh = lang === 'zh';
  const principles = [
    { icon: Layers, title: zh ? '同条件比较' : 'Like-for-like comparison', text: zh ? '固定模型、数据顺序、有效 batch 与超参。' : 'Identical models, data order, effective batch and hyperparameters.' },
    { icon: Fingerprint, title: zh ? '原始记录可追溯' : 'Traceable measurements', text: zh ? '速度与训练曲线均关联到实际运行记录。' : 'Speed and training curves linked to the original run logs.' },
    { icon: ShieldCheck, title: zh ? '先校验，再公布' : 'Validation before publication', text: zh ? '依据统一协议与 bf16 噪声带检查结果。' : 'A shared protocol and calibrated bf16 noise bands.' },
  ];
  return (
    <div id="nd-page" className="swift-surface-page swift-benchmark-page">
      <PageIntro eyebrow="MEASURED, NOT ASSUMED." title={zh ? '性能测试与曲线回归' : 'Performance & regression'}
        description={zh ? '在一致的条件下，比较训练速度与曲线。让每个数字都有来源，每项结论都有依据。'
          : 'Compare training speed and curves under the same conditions. Every measurement has a source.'}
        icon={<GitBranch size={15} />}>
        <div className="swift-benchmark-modes"><span>v4</span><i /><span>v5-ray</span><i /><span>v5-remote</span></div>
      </PageIntro>
      <div className="swift-container swift-benchmark-content">
        <div className="swift-benchmark-principles">
          {principles.map(({ icon: Icon, title, text }) => (
            <div key={title}><Icon size={21} /><h2>{title}</h2><p>{text}</p></div>
          ))}
        </div>
        <PerfReport data={perf as PerfData} zh={zh} />
      </div>
    </div>
  );
}
