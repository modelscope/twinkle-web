'use client';

import { usePathname, useRouter } from 'next/navigation';
import { versionMeta } from '@/lib/versions';

// Version switcher: keeps the current page path when the target version has
// the same page, otherwise lands on the version root. Pure client-side nav —
// all targets are statically exported pages.
export function VersionSelect({ current, lang }: { current: string; lang: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const zh = lang === 'zh';

  return (
    <label className="mb-2 flex items-center gap-2 px-2 text-sm">
      <span className="shrink-0 whitespace-nowrap text-fd-muted-foreground">{zh ? '版本' : 'Version'}</span>
      <select
        className="min-w-0 flex-1 rounded-md border border-fd-border bg-fd-card px-2 py-1.5 text-sm"
        value={current}
        onChange={(e) => {
          const next = e.target.value;
          const rest = pathname.replace(`/${lang}/docs/${current}`, '');
          router.push(`/${lang}/docs/${next}${rest}`);
        }}
      >
        {versionMeta.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label} · {zh ? v.note.zh : v.note.en}
          </option>
        ))}
      </select>
    </label>
  );
}
