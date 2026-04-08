import { useStore } from '../store/useStore';
import { Settings2 } from 'lucide-react';
import { useState } from 'react';

export default function TransparencySlider() {
  const transparency = useStore((state) => state.transparency);
  const setTransparency = useStore((state) => state.setTransparency);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title="组件透明度设置"
      >
        <Settings2 className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">透明度调节</span>
            <span className="text-xs text-zinc-500">{transparency}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={transparency}
            onChange={(e) => setTransparency(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <p className="text-[10px] text-zinc-500 mt-2 leading-tight">
            调低透明度可以更好地展示背景的摄影作品。
          </p>
        </div>
      )}
    </div>
  );
}