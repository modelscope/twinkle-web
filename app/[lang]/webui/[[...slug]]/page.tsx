import { webuiSource } from '@/lib/source';
import { SectionPage, sectionStaticParams, sectionMetadata } from '@/components/section';

type Params = { lang: string; slug?: string[] };

export default function Page({ params }: { params: Promise<Params> }) {
  return SectionPage({ source: webuiSource, section: 'webui', params });
}

export function generateStaticParams() {
  return sectionStaticParams(webuiSource);
}

export function generateMetadata({ params }: { params: Promise<Params> }) {
  return sectionMetadata(webuiSource, params);
}
