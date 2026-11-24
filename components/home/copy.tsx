'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useI18n } from 'fumadocs-ui/contexts/i18n';

export function CopyButton({ text, label, iconOnly = false }: { text: string; label?: string; iconOnly?: boolean }) {
  const { locale } = useI18n();
  const zh = locale === 'zh';
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentText = useRef(text);
  currentText.current = text;
  useEffect(() => {
    setDone(false);
    return () => { clearTimeout(timer.current); };
  }, [text]);
  const title = label ?? (zh ? '复制' : 'Copy');
  const success = zh ? '已复制' : 'Copied';

  return (
    <button type="button" aria-label={done ? success : title} title={done ? success : title}
      className={`swift-copy ${iconOnly ? 'swift-copy-icon' : ''}`} data-copied={done}
      onClick={async () => {
        let copied = false;
        try {
          await navigator.clipboard.writeText(text);
          copied = true;
        } catch {
          // 非 HTTPS 预览没有 Clipboard API，使用临时选区降级，不显示虚假的成功状态。
          const active = document.activeElement as HTMLElement | null;
          const area = document.createElement('textarea');
          area.value = text;
          area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
          document.body.appendChild(area);
          try { area.select(); copied = document.execCommand('copy'); }
          catch { copied = false; }
          finally { area.remove(); active?.focus(); }
        }
        if (copied && currentText.current === text) {
          setDone(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setDone(false), 1800);
        } else if (!copied) {
          window.prompt(zh ? '请手动复制：' : 'Copy this text:', text);
        }
      }}>
      {done ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      <span className={iconOnly ? 'sr-only' : ''} aria-live="polite">{done ? success : title}</span>
    </button>
  );
}
