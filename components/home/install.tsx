'use client';

import { useRef, useState } from 'react';
import { GitBranch, Package, Terminal } from 'lucide-react';
import { CopyButton } from './copy';

const commands = {
  pip: 'pip install -U "ms-swift>5.0.0"',
  source: 'git clone https://github.com/modelscope/ms-swift.git\ncd ms-swift\npip install -e .',
};
type Method = keyof typeof commands;

export function InstallPanel({ zh }: { zh: boolean }) {
  const [method, setMethod] = useState<Method>('pip');
  const pipRef = useRef<HTMLButtonElement>(null);
  const sourceRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="swift-install">
      <div className="swift-install-top">
        <span className="swift-terminal-dots" aria-hidden="true"><i /><i /><i /></span>
        <span className="swift-install-caption"><Terminal size={12} /> {zh ? '从这里开始' : 'START BUILDING'}</span>
        <span className="swift-install-runtime">Python</span>
      </div>
      <div className="swift-install-tabs" role="tablist" aria-label={zh ? '安装方式' : 'Installation method'}
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'pip' : event.key === 'End' ? 'source' : method === 'pip' ? 'source' : 'pip';
          setMethod(next);
          (next === 'pip' ? pipRef : sourceRef).current?.focus();
        }}>
        <button ref={pipRef} type="button" role="tab" id="install-pip-tab" aria-controls="install-panel"
          aria-selected={method === 'pip'} tabIndex={method === 'pip' ? 0 : -1} onClick={() => setMethod('pip')}>
          <Package size={15} /> {zh ? 'pip 安装' : 'Install with pip'}
        </button>
        <button ref={sourceRef} type="button" role="tab" id="install-source-tab" aria-controls="install-panel"
          aria-selected={method === 'source'} tabIndex={method === 'source' ? 0 : -1} onClick={() => setMethod('source')}>
          <GitBranch size={15} /> {zh ? 'Clone 源码' : 'Clone from source'}
        </button>
      </div>
      <div id="install-panel" role="tabpanel" aria-labelledby={`install-${method === 'pip' ? 'pip' : 'source'}-tab`} tabIndex={0}>
        <div className="swift-install-command">
          <pre key={method}><code>{commands[method]}</code></pre>
          <CopyButton text={commands[method]} label={zh ? '复制命令' : 'Copy command'} iconOnly />
        </div>
        <p className="swift-install-note">
          {method === 'pip'
            ? (zh ? '要求版本 > 5.0.0；对应版本发布后可用。体验当前开发版请选择源码安装。'
                  : 'Requires a published version > 5.0.0. For the current development version, install from source.')
            : (zh ? '从源码安装，体验最新开发版。建议使用独立 Python 环境。'
                  : 'Get the latest development version. Use an isolated Python environment.')}
        </p>
      </div>
    </div>
  );
}
