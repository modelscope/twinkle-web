// Client-safe version metadata (no server imports). lib/source.ts attaches a
// content loader to each entry; only versions with real documents live here.
export const versionMeta = [
  {
    id: '5.0.0.dev',
    label: '5.0.0.dev',
    note: { en: 'Development version', zh: '开发版本' },
  },
] as const;

export type VersionId = (typeof versionMeta)[number]['id'];
export const LATEST_VERSION: VersionId = versionMeta[0].id;
