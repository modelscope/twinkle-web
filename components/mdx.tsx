import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { PerfReport, type PerfData } from './perf-report';
import perf from '@/content/perf.json';

function ArchitectureDiagram({ src, alt }: { src: string; alt: string }) {
  return <img src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${src}`} alt={alt} className="w-full" />;
}

function PerformanceSnapshot({ lang }: { lang: 'en' | 'zh' }) {
  return <PerfReport data={perf as PerfData} zh={lang === 'zh'} />;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Tab,
    Tabs,
    Callout,
    Step,
    Steps,
    Card,
    Cards,
    PerformanceSnapshot,
    ArchitectureDiagram,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
