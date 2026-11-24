'use client';

import { RootProvider } from 'fumadocs-ui/provider/next';
import { i18nProvider } from 'fumadocs-ui/i18n';
import type { ReactNode } from 'react';
import { i18n } from '@/lib/i18n';
import { uiTranslations } from '@/lib/layout.shared';
import { SwiftSearchDialog } from './search-dialog';

export function Provider({ children, locale }: { children: ReactNode; locale: string }) {
  return (
    <RootProvider
      search={{ SearchDialog: SwiftSearchDialog }}
      i18n={i18nProvider(i18n.translations().add(uiTranslations), locale)}
    >
      {children}
    </RootProvider>
  );
}
