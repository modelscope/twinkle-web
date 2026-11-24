import { defineI18n } from 'fumadocs-core/i18n';

// English is the default language (matches the previous site). Locale is
// always present in the URL (/en/..., /zh/...) because static export has no
// middleware to negotiate it; the root page links to /en/.
export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
  hideLocale: 'never',
});

export type Lang = (typeof i18n.languages)[number];
