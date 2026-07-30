import { Scale } from 'lucide-react';
import WeightTracker from '../components/WeightTracker';

export default function Weight() {
  return (
    <div className="page-enter space-y-12 md:space-y-16">
      <header className="max-w-4xl pt-4 md:pt-10">
        <p className="eyebrow mb-5">Body metrics</p>
        <h1 className="page-title">把变化，<br />留给时间回答。</h1>
        <p className="mt-6 flex items-center gap-2 text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
          <Scale className="h-5 w-5" /> 每次打卡都会保存到你的个人记录中。
        </p>
      </header>

      <section className="mx-auto max-w-5xl" aria-label="体重记录器"><WeightTracker /></section>
    </div>
  );
}
