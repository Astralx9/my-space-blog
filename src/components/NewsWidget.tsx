import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Globe, Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useStore } from '../store/useStore';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

type Source = { name: string; count: number };
type NewsResponse = {
  items?: NewsItem[];
  sources?: Source[];
  failedSources?: string[];
  updatedAt?: string;
};

const safeTime = (date: string) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? '刚刚更新' : format(value, 'MM/dd HH:mm');
};

export default function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<'all' | 'cn' | 'intl'>('cn');
  const [topic, setTopic] = useState<'all' | 'tech' | 'finance' | 'ai'>('all');
  const extractedColors = useStore((state) => state.extractedColors);

  const loadNews = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ region, topic });
      const result = await fetch(`/api/news?${params.toString()}`, { signal });
      if (!result.ok) throw new Error(`资讯服务返回 ${result.status}`);
      const payload = await result.json() as NewsResponse;
      const items = Array.isArray(payload.items) ? payload.items : [];
      setNews(items);
      setSources(Array.isArray(payload.sources) ? payload.sources : []);
      setFailedSources(Array.isArray(payload.failedSources) ? payload.failedSources : []);
      setUpdatedAt(payload.updatedAt || null);
      if (items.length === 0) setError('当前筛选下没有可显示的真实资讯，请稍后刷新或切换分类。');
    } catch (caughtError) {
      if ((caughtError as Error).name !== 'AbortError') {
        setError('资讯服务暂时不可用，请稍后重试。');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [region, topic]);

  useEffect(() => {
    const controller = new AbortController();
    void loadNews(controller.signal);
    return () => controller.abort();
  }, [loadNews]);

  return (
    <div className="apple-surface rounded-[2.5rem] p-6 sm:p-10">
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
        <div>
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6" style={{ color: extractedColors?.secondary || '#10b981' }} />
            <h2 className="text-2xl font-semibold tracking-[-0.035em]">新闻资讯</h2>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            站内直连官方 RSS。来源、条数与暂不可用站点都会如实显示。
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="segmented-control" aria-label="新闻区域">
            {([['cn', '国内'], ['intl', '国际'], ['all', '全部']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setRegion(value)} className={`segmented-button ${region === value ? 'segmented-button-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="segmented-control" aria-label="新闻分类">
            {([['all', '综合'], ['tech', '科技'], ['ai', 'AI'], ['finance', '财经']] as const).map(([value, label]) => (
              <button key={value} onClick={() => setTopic(value)} className={`segmented-button ${topic === value ? 'segmented-button-active' : ''}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-2" aria-live="polite">
        {sources.map((source) => (
          <span key={source.name} className="news-source-chip">
            <ShieldCheck className="h-3.5 w-3.5" /> {source.name} · {source.count}
          </span>
        ))}
        {failedSources.map((source) => <span key={source} className="news-source-chip news-source-chip-muted">{source} 暂不可用</span>)}
        {updatedAt && <span className="ml-auto text-xs text-zinc-400">更新于 {safeTime(updatedAt)}</span>}
      </div>

      <div className="mt-7">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: extractedColors?.secondary || '#10b981' }} />
            <p className="text-sm">正在验证并汇集资讯...</p>
          </div>
        ) : error ? (
          <div className="flex min-h-52 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-red-300/70 px-6 text-center text-sm text-red-600 dark:border-red-400/30 dark:text-red-300" role="alert">
            <p>{error}</p>
            <button className="apple-button-secondary" onClick={() => void loadNews()}><RefreshCw className="h-4 w-4" />重新获取</button>
          </div>
        ) : (
          <ul className="grid gap-3" aria-label="新闻列表">
            {news.map((item) => (
              <li key={`${item.source}-${item.link}`}>
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="news-row group">
                  <span className="news-row-dot" style={{ backgroundColor: extractedColors?.secondary || '#10b981' }} />
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-base font-semibold leading-snug text-zinc-900 transition-colors group-hover:text-[rgb(var(--theme-primary))] dark:text-zinc-100">
                      {item.title}
                    </span>
                    <span className="mt-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-semibold">{item.source}</span><span>{safeTime(item.pubDate)}</span>
                    </span>
                  </span>
                  <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[rgb(var(--theme-primary))]" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
