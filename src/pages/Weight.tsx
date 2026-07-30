import { Scale } from 'lucide-react';
import WeightTracker from '../components/WeightTracker';

export default function Weight() {
  return (
    <div className="page-enter space-y-12 md:space-y-16">
      <header className="flex min-h-[42vh] max-w-4xl flex-col justify-end text-white">
        <p className="hero-text-shadow mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Body metrics</p>
        <h1 className="page-title page-slogan-gradient hero-text-shadow">把变化，<br />留给时间回答。</h1>
        <p className="hero-text-shadow mt-6 flex items-center gap-2 text-lg leading-relaxed text-white/85 md:text-xl">
          <Scale className="h-5 w-5" /> 每次打卡都会保存到你的个人记录中。
        </p>
      </header>

      <section className="mx-auto max-w-5xl" aria-label="体重记录器"><WeightTracker /></section>
    </div>
  );
}
