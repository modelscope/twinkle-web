'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';

type Row = {
  model: string;
  task: string;
  mode: 'v4' | 'v5-ray' | 'v5-remote';
  step_wall_clock_s: number;
  tokens_per_s: number;
  source_log: string;
  gpu?: string;
  config?: string;
};

type Curve = {
  model: string;
  task: string;
  metric: string;
  series: { mode: string; points: [number, number][] }[];
};

export type PerfData =
  | { status: 'pending' }
  | {
      status: 'ready';
      table: { rows: Row[]; window?: string; commit?: string };
      curve_data?: { curves: Curve[] };
      regression_verdict?: { pairs?: { a: string; b: string; median_rel_dev: number; verdict: string }[] };
    };

const MODE_STYLE: Record<string, { color: string; dash: string }> = {
  v4: { color: 'var(--perf-v4, #8a8397)', dash: '6 4' },
  'v5-ray': { color: 'var(--perf-ray, #4063a1)', dash: '' },
  'v5-remote': { color: 'var(--perf-remote, #54447a)', dash: '2 3' },
};

function Chart({ curve }: { curve: Curve }) {
  const all = curve.series.flatMap((s) => s.points);
  if (all.length === 0) return null;
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 560, H = 240, P = 36;
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  return (
    <figure className="swift-card p-4">
      <figcaption className="mb-2 text-sm font-medium">
        {curve.model} · {curve.task} · {curve.metric}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${curve.metric} curves`} className="w-full">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" strokeOpacity={0.3} />
        <line x1={P} y1={P} x2={P} y2={H - P} stroke="currentColor" strokeOpacity={0.3} />
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.6}>step</text>
        <text x={12} y={P - 10} fontSize={11} fill="currentColor" opacity={0.6}>{curve.metric}</text>
        {curve.series.map((s) => (
          <polyline
            key={s.mode}
            fill="none"
            strokeWidth={2}
            stroke={MODE_STYLE[s.mode]?.color ?? '#2f6f8f'}
            strokeDasharray={MODE_STYLE[s.mode]?.dash || undefined}
            points={s.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')}
          />
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        {curve.series.map((s) => (
          <span key={s.mode} className="inline-flex items-center gap-1.5">
            <svg width="22" height="6" aria-hidden>
              <line x1="0" y1="3" x2="22" y2="3" strokeWidth={2}
                stroke={MODE_STYLE[s.mode]?.color ?? '#2f6f8f'}
                strokeDasharray={MODE_STYLE[s.mode]?.dash || undefined} />
            </svg>
            {s.mode}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function PerfReport({ data, zh }: { data: PerfData; zh: boolean }) {
  const models = data.status === 'ready' ? [...new Set(data.table.rows.map((r) => r.model))] : [];
  const tasks = data.status === 'ready' ? [...new Set(data.table.rows.map((r) => r.task))] : [];
  const [model, setModel] = useState(models[0] ?? '');
  const [task, setTask] = useState(tasks[0] ?? '');

  if (data.status !== 'ready') {
    return (
      <div className="swift-perf-pending">
        <span className="swift-perf-emblem"><Database size={29} aria-hidden="true" /></span>
        <span className="swift-eyebrow">AWAITING VERIFIED RESULTS</span>
        <h2>{zh ? '结果尚未公布' : 'Results not published yet'}</h2>
        <p>{zh
          ? '速度取稳态段的墙钟时间与 tokens/s，曲线回归先标定 bf16 噪声带。结果通过校验后才会出现在这里，在此之前不展示性能数字。'
          : 'Steady-state wall clock and tokens/s measure speed; curve regression starts with calibrated bf16 noise bands. Measurements appear only after validation.'}</p>
        <div className="swift-perf-pending-footer"><span>{zh ? '原始运行记录' : 'Original run logs'}</span><i /><span>{zh ? '统一比较协议' : 'Shared comparison protocol'}</span><i /><span>{zh ? '校验后的结果' : 'Validated results'}</span></div>
      </div>
    );
  }

  const rows = data.table.rows.filter((r) => r.model === model && r.task === task);
  const curves = (data.curve_data?.curves ?? []).filter((c) => c.model === model && c.task === task);
  const base = rows.find((r) => r.mode === 'v4');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <span className="text-fd-muted-foreground">{zh ? '模型' : 'Model'}</span>
          <select className="rounded-md border border-fd-border bg-fd-card px-2 py-1.5" value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
        <label className="inline-flex items-center gap-2">
          <span className="text-fd-muted-foreground">{zh ? '任务' : 'Task'}</span>
          <select className="rounded-md border border-fd-border bg-fd-card px-2 py-1.5" value={task} onChange={(e) => setTask(e.target.value)}>
            {tasks.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <div className="swift-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fd-border text-left text-fd-muted-foreground">
              <th className="px-4 py-2.5">{zh ? '形态' : 'Mode'}</th>
              <th className="px-4 py-2.5">{zh ? '稳态 step 墙钟 (s)' : 'Steady step wall clock (s)'}</th>
              <th className="px-4 py-2.5">tokens/s</th>
              <th className="px-4 py-2.5">{zh ? '相对 v4 加速' : 'Speedup vs v4'}</th>
              <th className="px-4 py-2.5">{zh ? '来源' : 'Source'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.mode} className="border-b border-fd-border last:border-0">
                <td className="px-4 py-2.5 font-medium">{r.mode}</td>
                <td className="px-4 py-2.5 tabular-nums">{r.step_wall_clock_s.toFixed(3)}</td>
                <td className="px-4 py-2.5 tabular-nums">{Math.round(r.tokens_per_s).toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums">
                  {base && r.mode !== 'v4' ? `${(base.step_wall_clock_s / r.step_wall_clock_s).toFixed(2)}×` : '—'}
                </td>
                <td className="px-4 py-2.5 text-xs text-fd-muted-foreground">{r.source_log}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {curves.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {curves.map((c, i) => <Chart key={i} curve={c} />)}
        </div>
      )}

      {data.regression_verdict?.pairs && data.regression_verdict.pairs.length > 0 && (
        <div className="swift-card p-4 text-sm">
          <h3 className="font-semibold">{zh ? '曲线回归判词' : 'Curve regression verdicts'}</h3>
          <ul className="mt-2 space-y-1 text-fd-muted-foreground">
            {data.regression_verdict.pairs.map((p, i) => (
              <li key={i}>{p.a} ↔ {p.b}: {(p.median_rel_dev * 100).toFixed(2)}% {zh ? '逐步相对偏差中位数' : 'median per-step relative deviation'} — {p.verdict}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
