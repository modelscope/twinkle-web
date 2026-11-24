import { servicesSource } from '@/lib/source';
import { SectionPage, sectionStaticParams, sectionMetadata } from '@/components/section';

type Params = { lang: string; slug?: string[] };

export default function Page({ params }: { params: Promise<Params> }) {
  return SectionPage({ source: servicesSource, section: 'services', params });
}

export function generateStaticParams() {
  return sectionStaticParams(servicesSource);
}

export function generateMetadata({ params }: { params: Promise<Params> }) {
  return sectionMetadata(servicesSource, params);
}
