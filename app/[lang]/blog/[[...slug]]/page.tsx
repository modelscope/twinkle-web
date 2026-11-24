import { blogSource } from '@/lib/source';
import { SectionPage, sectionStaticParams, sectionMetadata } from '@/components/section';

type Params = { lang: string; slug?: string[] };

export default function Page({ params }: { params: Promise<Params> }) {
  return SectionPage({ source: blogSource, section: 'blog', params });
}

export function generateStaticParams() {
  return sectionStaticParams(blogSource);
}

export function generateMetadata({ params }: { params: Promise<Params> }) {
  return sectionMetadata(blogSource, params);
}
