import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Scale, Plus } from 'lucide-react';

export default function WeightTracker() {
  const weights = useStore((state) => state.weights);
  const addWeight = useStore((state) => state.addWeight);
  const extractedColors = useStore((state) => state.extractedColors);
  
  const [newWeight, setNewWeight] = useState('');

  const chartData = useMemo(() => {
    return weights.map(w => ({
      ...w,
      displayDate: format(w.date, 'MM/dd')
    }));
  }, [weights]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight);
    if (!isNaN(w) && w > 0 && w < 300) {
      addWeight(w);
      setNewWeight('');
    }
  };

  const latestWeight = weights.length > 0 ? weights[weights.length - 1].weight : null;

  return (
    <div className="apple-surface flex h-full min-h-[34rem] flex-col rounded-[2.5rem] p-7 sm:p-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <h2 className="flex items-center gap-3 text-2xl font-semibold tracking-[-0.035em]">
          <Scale className="w-6 h-6" style={{ color: extractedColors?.primary || '#3b82f6' }} />
          体重记录器
        </h2>
        {latestWeight && (
          <div className="text-right text-xs font-medium text-zinc-500">
            最新<br /><span className="text-2xl font-semibold tracking-[-0.04em] text-zinc-900 dark:text-zinc-100">{latestWeight}</span> kg
          </div>
        )}
      </div>

      <div className="mb-8 h-64 w-full flex-1">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa" opacity={0.2} />
              <XAxis dataKey="displayDate" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white)' }}
                formatter={(value: number) => [`${value} kg`, '体重']}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke={extractedColors?.primary || '#3b82f6'}
                strokeWidth={3}
                dot={{ r: 4, fill: extractedColors?.primary || '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            暂无体重记录
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="number"
          step="0.1"
          min="1"
          max="300"
          placeholder="输入今日体重 (kg)"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          className="apple-input min-w-0 flex-1"
          required
        />
        <button
          type="submit"
          disabled={!newWeight}
          className="apple-button px-5"
        >
          <Plus className="w-4 h-4" />
          打卡
        </button>
      </form>
    </div>
  );
}
