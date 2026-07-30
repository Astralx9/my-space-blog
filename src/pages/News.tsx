import { Newspaper } from 'lucide-react';
import NewsWidget from '../components/NewsWidget';

export default function News() {
  return (
    <div className="page-enter space-y-12 md:space-y-16">
      <header className="flex min-h-[42vh] max-w-4xl flex-col justify-end text-white">
        <p className="hero-text-shadow mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Curated feeds</p>
        <h1 className="page-title page-slogan-gradient hero-text-shadow">新闻，不猜测。<br />只展示真实来源。</h1>
        <p className="hero-text-shadow mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
          由站内服务直连官方 RSS 聚合；每一条都保留原始来源与链接。
        </p>
      </header>

      <section aria-label="新闻资讯"><NewsWidget /></section>

      <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Newspaper className="h-4 w-4" /> 若某个站点暂时不可达，它会被明确标记，不会用虚构内容补齐。
      </p>
    </div>
  );
}
