import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { Loader2, Minus, Plus, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function WeightTracker() {
  const weights = useStore((state) => state.weights);
  const addWeight = useStore((state) => state.addWeight);
  const extractedColors = useStore((state) => state.extractedColors);
  const [newWeight, setNewWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const chartData = useMemo(() => weights.map((record) => ({
    ...record,
    displayDate: format(new Date(record.date), 'M/d'),
  })), [weights]);

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;
  const firstWeight = weights.length > 0 ? weights[0].weight : null;
  const change = latestWeight !== null && firstWeight !== null && weights.length > 1 ? latestWeight - firstWeight : null;
  const themeColor = extractedColors?.primary || '#0071e3';

  const chartDomain = useMemo(() => {
    const values = chartData.map((record) => record.weight);
    if (values.length < 2) return [0, 1] as [number, number];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const padding = Math.max(0.35, (maximum - minimum) * 0.6);
    return [Number((minimum - padding).toFixed(1)), Number((maximum + padding).toFixed(1))] as [number, number];
  }, [chartData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number.parseFloat(newWeight);
    if (!Number.isFinite(value) || value <= 0 || value >= 300) {
      setFormError('请输入 0 到 300 之间的体重数值。');
      return;
    }

    setFormError('');
    setIsSaving(true);
    try {
      await addWeight(value);
      setNewWeight('');
    } catch (error) {
      console.error('Failed to save weight:', error);
      setFormError('记录未保存成功，请检查网络后重试。');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="apple-surface apple-surface-interactive flex min-h-[38rem] flex-col rounded-[2.5rem] p-6 sm:p-10">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow mb-3">Body metrics</p>
          <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.035em]">
            <Scale className="h-6 w-6" style={{ color: themeColor }} />
            体重记录器
          </h2>
        </div>
        {latestWeight !== null && (
          <div className="rounded-2xl border border-black/[0.06] bg-white/55 px-4 py-3 text-right shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.05]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">最新记录</p>
            <p className="mt-1 text-3xl font-semibold tracking-[-0.055em] text-zinc-950 dark:text-white">{latestWeight.toFixed(1)}<span className="ml-1 text-sm font-medium text-zinc-500">kg</span></p>
          </div>
        )}
      </div>

      <section className="relative mt-8 flex-1 overflow-hidden rounded-[2rem] border border-black/[0.06] bg-gradient-to-br from-white/85 via-white/60 to-[rgb(var(--theme-primary)/0.10)] p-5 shadow-inner dark:border-white/10 dark:from-white/[0.08] dark:via-white/[0.03] dark:to-[rgb(var(--theme-primary)/0.16)] sm:p-7">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">变化趋势</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{chartData.length > 1 ? `从 ${format(new Date(weights[0].date), 'M月d日')} 开始的真实记录` : '记录会在这里自然延展'}</p>
          </div>
          {change !== null && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-sm font-semibold shadow-sm dark:bg-black/15" style={{ color: themeColor }}>
              {change < 0 ? <TrendingDown className="h-4 w-4" /> : change > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {change === 0 ? '保持不变' : `${change > 0 ? '+' : ''}${change.toFixed(1)} kg`}
            </div>
          )}
        </div>

        <div className="relative mt-5 h-64 w-full sm:h-72">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 18, right: 6, bottom: 0, left: 6 }}>
                <defs>
                  <linearGradient id="weight-trend-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={themeColor} stopOpacity={0.34} />
                    <stop offset="100%" stopColor={themeColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fill: '#71717a', fontSize: 12 }} dy={10} />
                <YAxis hide domain={chartDomain} />
                <Tooltip
                  cursor={{ stroke: themeColor, strokeOpacity: 0.25, strokeDasharray: '4 5' }}
                  contentStyle={{ borderRadius: '16px', border: '1px solid rgb(0 0 0 / 0.08)', boxShadow: '0 16px 36px rgb(0 0 0 / 0.14)', background: 'rgb(255 255 255 / 0.92)', padding: '10px 12px' }}
                  labelStyle={{ color: '#71717a', fontSize: 12, marginBottom: 3 }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)} kg`, '体重']}
                />
                <Area type="monotone" dataKey="weight" stroke={themeColor} strokeWidth={3} fill="url(#weight-trend-fill)" dot={{ r: 4, fill: themeColor, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: themeColor, stroke: '#fff', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : chartData.length === 1 ? (
            <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl bg-white/30 text-center dark:bg-black/10">
              <svg aria-hidden="true" viewBox="0 0 720 220" className="absolute inset-x-0 bottom-5 h-40 w-full text-zinc-400/40">
                <line x1="48" y1="120" x2="672" y2="120" stroke="currentColor" strokeDasharray="5 10" strokeWidth="2" />
                <circle cx="360" cy="120" r="12" fill={themeColor} stroke="white" strokeWidth="5" />
                <circle cx="360" cy="120" r="24" fill={themeColor} fillOpacity="0.13" />
              </svg>
              <div className="relative z-10 -mt-8">
                <p className="text-4xl font-semibold tracking-[-0.06em] text-zinc-950 dark:text-white">{latestWeight?.toFixed(1)}<span className="ml-1 text-base font-medium text-zinc-500">kg</span></p>
                <p className="mt-3 text-sm text-zinc-500">这是第一笔记录；再打卡一次，就会生成真实趋势。</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300/80 text-center dark:border-zinc-700">
              <Scale className="mb-3 h-7 w-7 text-zinc-400" />
              <p className="text-sm font-medium text-zinc-500">今天的数字，会成为第一条趋势。</p>
            </div>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row" noValidate>
        <label className="sr-only" htmlFor="weight-input">输入今日体重（kg）</label>
        <input id="weight-input" type="number" step="0.1" min="1" max="300" inputMode="decimal" placeholder="输入今日体重（kg）" value={newWeight} onChange={(event) => { setNewWeight(event.target.value); setFormError(''); }} className="apple-input min-w-0 flex-1" required />
        <button type="submit" disabled={isSaving || !newWeight} className="apple-button justify-center px-6">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {isSaving ? '保存中' : '打卡'}
        </button>
      </form>
      {formError && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{formError}</p>}
    </div>
  );
}

