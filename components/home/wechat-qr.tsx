'use client';

import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { asset } from '@/lib/site';

// Popover 负责边界避让、点击外部关闭、Escape 与焦点恢复，窄屏不会被二维码撑开。
export function WechatQr({ label }: { label: string }) {
  return (
    <span className="relative inline-flex">
      <Popover>
        <PopoverTrigger className="text-sm text-fd-muted-foreground" aria-label={label}>{label}</PopoverTrigger>
        <PopoverContent side="top" sideOffset={12} collisionPadding={16} className="w-auto p-3 text-center">
          <img src={asset('/images/wechat.png')} alt={label} width={180} height={180} />
          <span className="mt-2 block text-xs text-fd-muted-foreground">{label}</span>
        </PopoverContent>
      </Popover>
    </span>
  );
}
