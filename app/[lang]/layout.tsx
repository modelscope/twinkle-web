import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { Provider } from '@/components/provider';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <Provider locale={lang}>{children}</Provider>
      </body>
    </html>
  );
}
