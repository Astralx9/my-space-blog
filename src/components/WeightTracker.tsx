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
    <div className="bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Scale className="w-6 h-6" style={{ color: extractedColors?.primary || '#3b82f6' }} />
          体重记录器
        </h2>
        {latestWeight && (
          <div className="text-sm text-zinc-500">
            最新体重: <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{latestWeight}</span> kg
          </div>
        )}
      </div>

      <div className="h-48 w-full mb-6">
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
          className="flex-1 px-4 py-2 bg-zinc-100/[var(--component-bg-alpha)] dark:bg-zinc-900/[var(--component-bg-alpha)] border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
          required
        />
        <button
          type="submit"
          disabled={!newWeight}
          className="flex items-center justify-center gap-1 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          打卡
        </button>
      </form>
    </div>
  );
}
