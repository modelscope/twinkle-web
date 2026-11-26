'use client';

import { useState } from 'react';
import { Database } from 'lucide-react';

type Row = {
  model: string;
  task: string;
  mode: 'v4' | 'v5-ray' | 'v5-remote';
  step_wall_clock_s: number | null;
  tokens_per_s: number | null;
  wall_time_s?: number | null;
  std_s?: number | null;
  first_step_s?: number;
  elapsed_s?: number;
  timing: string;
  timing_note: string;
  source_log: string;
  config: string;
  window: string;
};
type Curve = {
  model: string;
  task: string;
  metric: string;
  series: { mode: string; points: [number, number][]; source: string }[];
};
type Metric = { first: number; last: number; min: number; max: number; early_mean?: number; late_mean?: number };
type Stability = { model: string; task: string; mode: string; steps: number; source: string;
  loss?: Metric; reward?: Metric; grad_norm?: Metric; approx_kl?: Metric; ratio_oob_low?: Metric };
export type PerfData =
  | { status: 'pending' }
  | { status: 'ready'; table: { rows: Row[]; commit: string }; curve_data: { curves: Curve[] };
      stability: Stability[];
      regression_verdict: { pairs: { model: string; task: string; a: string; b: string;
        median_rel_dev: number; endpoint_rel_dev: number; verdict: string; source: string; endpoint_source?: string; verdict_source?: string }[] };
      self_control: { exact_equal_steps: number; steps: number };
      protocol: { gpu: string; baseline_commits: Record<string, string>; sources: string[] } };

const MODE_STYLE: Record<string, { color: string; dash: string }> = {
  v4: { color: 'var(--perf-v4, #8a8397)', dash: '6 4' },
  'v5-ray': { color: 'var(--perf-ray, #4063a1)', dash: '' },
  'v5-remote': { color: 'var(--perf-remote, #54447a)', dash: '2 3' },
};
const TIMING: Record<string, [string, string]> = {
  steady_step: ['稳态 step', 'Steady step'],
  full_cycle_mean: ['全周期平均', 'Full-cycle average'],
  trainer_compute: ['trainer compute 段', 'Trainer compute only'],
  server_compute: ['server compute 段', 'Server compute only'],
  recorded_step: ['记录中的 step（见来源）', 'Recorded step (see source)'],
  total_only: ['仅总墙钟', 'Total wall clock only'],
};
const display = (value: number | null | undefined, zh: boolean) =>
  value == null ? (zh ? '未记录' : 'Not recorded') : value.toFixed(3);

function Chart({ curve }: { curve: Curve }) {
  const all = curve.series.flatMap((s) => s.points);
  if (!all.length) return null;
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 560, H = 255, P = 48;
  const sx = (x: number) => P + ((x - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  return (
    <figure className="swift-card p-4">
      <figcaption className="mb-2 text-sm font-medium">{curve.model} · {curve.task} · {curve.metric}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${curve.metric} by optimizer step`} className="w-full">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="currentColor" strokeOpacity={0.3} />
        <line x1={P} y1={P} x2={P} y2={H - P} stroke="currentColor" strokeOpacity={0.3} />
        <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="currentColor">optimizer step</text>
        <text x={P - 4} y={P - 12} fontSize={11} fill="currentColor">{y1.toPrecision(3)}</text>
        <text x={P - 4} y={H - P + 15} fontSize={11} fill="currentColor">{y0.toPrecision(3)}</text>
        <text x={P} y={H - P + 30} fontSize={11} fill="currentColor">{x0}</text>
        <text x={W - P} y={H - P + 30} textAnchor="end" fontSize={11} fill="currentColor">{x1}</text>
        {curve.series.map((s) => (
          <g key={s.mode}>
            <polyline fill="none" strokeWidth={2} stroke={MODE_STYLE[s.mode]?.color}
              strokeDasharray={MODE_STYLE[s.mode]?.dash || undefined}
              points={s.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} />
            {s.points.map(([x, y]) => <circle key={x} cx={sx(x)} cy={sy(y)} r={2.5} fill={MODE_STYLE[s.mode]?.color}>
              <title>{`${s.mode}: step ${x}, ${curve.metric}=${y}`}</title>
            </circle>)}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs">
        {curve.series.map((s) => <a key={s.mode} href={s.source} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 underline">
          <svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" strokeWidth={2}
            stroke={MODE_STYLE[s.mode]?.color} strokeDasharray={MODE_STYLE[s.mode]?.dash || undefined} /></svg>{s.mode}
        </a>)}
      </div>
    </figure>
  );
}

export function PerfReport({ data, zh }: { data: PerfData; zh: boolean }) {
  const models = data.status === 'ready' ? [...new Set(data.table.rows.map((r) => r.model))] : [];
  const [model, setModel] = useState(models[0] ?? '');
  const [selectedTask, setTask] = useState('sft');
  if (data.status !== 'ready') return (
    <div className="swift-perf-pending">
      <span className="swift-perf-emblem"><Database size={29} aria-hidden="true" /></span>
      <h2>{zh ? '性能数据尚未同步' : 'Performance snapshot not synchronized'}</h2>
      <p>{zh ? '内容准备流程会从已完成的实验记录同步数据；不使用缺失值或估算数字。'
        : 'Content preparation imports completed experiment records without fabricated or estimated values.'}</p>
    </div>
  );
  const tasks = [...new Set(data.table.rows.filter((r) => r.model === model).map((r) => r.task))];
  const task = tasks.includes(selectedTask) ? selectedTask : tasks[0];
  const rows = data.table.rows.filter((r) => r.model === model && r.task === task);
  const curves = data.curve_data.curves.filter((c) => c.model === model && c.task === task);
  const stability = data.stability.filter((s) => s.model === model && s.task === task);
  const pairs = data.regression_verdict.pairs.filter((p) => p.model === model && p.task === task);
  return (
    <div className="space-y-6">
      <div className="swift-card p-4 text-sm space-y-2">
        <p>{zh ? '硬件：8 × NVIDIA H20 96GB；每项实际用卡和放置见下表来源。' : 'Hardware: 8 × NVIDIA H20 96GB; per-run devices and placement are recorded in sources.'}</p>
        <p>{zh ? '有效 batch、数据顺序、LoRA 初始化与超参对齐后比较曲线。计时区分稳态、全周期、计算段及总墙钟；不同口径不计算统一加速倍数。v5 整秒计时有量化噪声。'
          : 'Align effective batch, data order, LoRA initialization and hyperparameters. Steady steps, full cycles, compute segments and total wall clock are distinct; no ratios across timing scopes. v5 integer-second timing has quantization noise.'}</p>
        <p>{zh ? '4B remote GRPO 曲线采用最新重跑；旧计时单独保留来源，不代表重跑时延。Router replay R2 与 R3 分开显示。' : '4B remote GRPO curves use the latest rerun; historical timing is separate and does not measure that rerun. Router replay R2 and R3 are shown separately.'}</p>
        <p>{zh ? '协议与版本记录：' : 'Protocol and versions: '}{data.protocol.sources.map((url, i) =>
          <a key={url} href={url} target="_blank" rel="noreferrer" className="mr-3 underline">{['Protocol', 'Version lock', 'Verdicts'][i]}</a>)}</p>
        <p className="break-all text-xs">{Object.entries(data.protocol.baseline_commits).map(([name, commit]) => `${name}: ${commit}`).join(' · ')}</p>
        <p className="text-xs">{zh ? '以上为批次起始基线；各运行的后续版本记录以来源为准。结果快照 commit：' : 'These are batch starting baselines; per-run follow-up versions are recorded in sources. Results snapshot commit: '}{data.table.commit}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <label>{zh ? '模型 ' : 'Model '}<select className="rounded border bg-fd-card px-2 py-1.5" value={model} onChange={(e) => setModel(e.target.value)}>
          {models.map((m) => <option key={m}>{m}</option>)}</select></label>
        <label>{zh ? '任务 ' : 'Task '}<select className="rounded border bg-fd-card px-2 py-1.5" value={task} onChange={(e) => setTask(e.target.value)}>
          {tasks.map((t) => <option key={t}>{t}</option>)}</select></label>
      </div>
      <div className="swift-card overflow-x-auto">
        <table className="w-full text-sm"><thead><tr className="border-b text-left">
          {[zh ? '形态 / 计时口径' : 'Mode / timing scope', zh ? '每 step (s)' : 'Seconds / step', 'tokens/s', zh ? '总墙钟 (s)' : 'Total wall (s)', zh ? '条件与来源' : 'Conditions and source'].map((text) => <th key={text} className="px-4 py-2.5">{text}</th>)}
        </tr></thead><tbody>{rows.map((r) => <tr key={r.mode} className="border-b last:border-0">
          <td className="px-4 py-2.5">{r.mode}<div className="text-xs text-fd-muted-foreground">{TIMING[r.timing]?.[zh ? 0 : 1] ?? r.timing}</div></td>
          <td className="px-4 py-2.5 tabular-nums">{display(r.step_wall_clock_s, zh)}{r.std_s != null && ` ± ${r.std_s.toFixed(3)}`}</td>
          <td className="px-4 py-2.5 tabular-nums">{display(r.tokens_per_s, zh)}</td>
          <td className="px-4 py-2.5 tabular-nums">{display(r.wall_time_s, zh)}</td>
          <td className="px-4 py-2.5 text-xs"><div>{r.config}</div><div>{r.window} · {r.timing_note}</div>
            {r.first_step_s != null && <div>{zh ? '首步含启动：' : 'First step including startup: '}{r.first_step_s}s</div>}
            {r.elapsed_s != null && <div>{zh ? '记录累计 elapsed：' : 'Recorded cumulative elapsed: '}{r.elapsed_s}s</div>}
            <a href={r.source_log} target="_blank" rel="noreferrer" className="underline">{zh ? '原始计时记录' : 'Timing source'}</a></td>
        </tr>)}</tbody></table>
      </div>
      {curves.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{curves.map((c) => <Chart key={c.metric} curve={c} />)}</div>}
      <div className="swift-card p-4 text-sm">
        <h3>{zh ? '曲线与稳定性' : 'Curves and stability'}</h3>
        {stability.map((s) => <div key={s.mode} className="mt-3">
          <a href={s.source} target="_blank" rel="noreferrer" className="underline">{s.mode} · {s.steps} steps</a>
          {s.loss && <span> · loss {s.loss.first} → {s.loss.last}</span>}
          {s.reward && <span> · reward {s.reward.early_mean?.toFixed(4)} → {s.reward.late_mean?.toFixed(4)} ({zh ? '前 / 后 5 步均值' : 'first / last 5-step means'})</span>}
          <div>grad_norm: {s.grad_norm ? `${s.grad_norm.min}–${s.grad_norm.max}` : (zh ? '未记录' : 'Not recorded')}
            {s.approx_kl && ` · KL: ${s.approx_kl.min}–${s.approx_kl.max}`}
            {s.ratio_oob_low && ` · ratio_oob_low: ${s.ratio_oob_low.min}–${s.ratio_oob_low.max}`}</div>
        </div>)}
        {pairs.map((p) => <p key={`${p.a}-${p.b}`} className="mt-2">
          <a href={p.source} target="_blank" rel="noreferrer" className="underline">{p.a} ↔ {p.b}</a>: {(p.median_rel_dev * 100).toFixed(3)}% {zh ? '逐步相对差中位数' : 'median relative deviation'} · <a href={p.endpoint_source ?? p.source} className="underline">{(p.endpoint_rel_dev * 100).toFixed(3)}% {zh ? '终点差' : 'endpoint deviation'}</a> · <a href={p.verdict_source ?? p.source} target="_blank" rel="noreferrer" className="underline">{p.verdict}</a>
        </p>)}
        {model === 'Qwen3.5-4B' && task === 'sft' && <p className="mt-3">{zh ? '同配置 v5-ray 复跑逐步 loss 相等：' : 'Identical v5-ray repeat losses: '}{data.self_control.exact_equal_steps}/{data.self_control.steps} steps.</p>}
        <p className="mt-3 text-fd-muted-foreground">{zh ? 'SFT 判据为首步紧配、终点差 <5% 且无单调系统发散。GRPO 查看 reward 趋势与有限梯度，不要求采样轨迹逐位一致。该批训练回归不代表下游能力榜单。' : 'SFT requires aligned initial loss, endpoint deviation below 5% and no monotonic systematic divergence. GRPO compares reward trends and finite gradients, not bitwise trajectories. Training regression is not a downstream leaderboard.'}</p>
      </div>
    </div>
  );
}
