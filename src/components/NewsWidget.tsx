import { useState, useEffect } from 'react';
import { Globe, ExternalLink, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

type RssResponse = { status?: string; items?: Array<Pick<NewsItem, 'title' | 'link' | 'pubDate'>> };

// We will use rss2json public API for easy parsing in browser without dealing with XML/CORS directly
const RSS2JSON_API = 'https://api.rss2json.com/v1/api.json?rss_url=';

export default function NewsWidget() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for dual-level filtering
  const [region, setRegion] = useState<'all' | 'cn' | 'intl'>('all');
  const [topic, setTopic] = useState<'all' | 'tech' | 'finance' | 'ai'>('all');
  
  const extractedColors = useStore((state) => state.extractedColors);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const allNews: NewsItem[] = [];
        
        const feedsToFetch = [];
        
        // --- Region: CN (China) or ALL ---
        if (region === 'all' || region === 'cn') {
          if (topic === 'all' || topic === 'tech') {
            feedsToFetch.push({ name: 'Solidot 科技', url: 'https://www.solidot.org/index.rss' });
            feedsToFetch.push({ name: '少数派', url: 'https://rsshub.app/36kr/newsflashes' }); // Fallback 36Kr if solidot fails
          }
          if (topic === 'all' || topic === 'finance') {
            feedsToFetch.push({ name: '华尔街见闻', url: 'https://rsshub.app/wallstreetcn/news/global' });
          }
          if (topic === 'all' || topic === 'ai') {
            feedsToFetch.push({ name: 'AI资讯', url: 'https://rsshub.app/36kr/motif/32768' }); // 36Kr AI
          }
        }
        
        // --- Region: INTL (International) or ALL ---
        if (region === 'all' || region === 'intl') {
          if (topic === 'all' || topic === 'tech') {
            feedsToFetch.push({ name: 'Hacker News', url: 'https://hnrss.org/frontpage' });
            feedsToFetch.push({ name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' });
          }
          if (topic === 'all' || topic === 'finance') {
            feedsToFetch.push({ name: 'WSJ Markets', url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml' });
            feedsToFetch.push({ name: 'Yahoo Finance', url: 'https://search.yahoo.com/mrss/finance/news' });
          }
          if (topic === 'all' || topic === 'ai') {
            feedsToFetch.push({ name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' });
            feedsToFetch.push({ name: 'MIT Tech Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' });
          }
        }

        let successfulFeeds = 0;

        for (const feed of feedsToFetch) {
          try {
            const res = await fetch(`${RSS2JSON_API}${encodeURIComponent(feed.url)}`);
            if (!res.ok) continue;
            const data = await res.json() as RssResponse;
            if (data.status === 'ok' && data.items && data.items.length > 0) {
              // Increase from 5 to 10 per feed to ensure we have enough items
            const items = data.items.slice(0, 10).map((item) => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                source: feed.name
              }));
              allNews.push(...items);
              successfulFeeds++;
            }
          } catch {
            console.warn(`Failed to fetch feed ${feed.name}`);
          }
        }

        // Sort by date desc
        allNews.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
        setNews(allNews.slice(0, 20)); // Increase display limit to 20
        
        if (allNews.length === 0 && successfulFeeds === 0) {
          setError('当前节点暂无可用资讯，请尝试切换其它分类。');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [region, topic]);

  return (
    <div className="apple-surface flex h-full flex-col rounded-[2.5rem] p-7 sm:p-10">
      <div className="mb-8 flex flex-col justify-between gap-5 2xl:flex-row 2xl:items-center">
        <h2 className="flex shrink-0 items-center gap-3 text-2xl font-semibold tracking-[-0.035em]">
          <Globe className="w-6 h-6" style={{ color: extractedColors?.secondary || '#10b981' }} />
          今日资讯速递
        </h2>
        
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          {/* Region Filter */}
          <div className="segmented-control">
            <button
              onClick={() => setRegion('all')}
              className={`segmented-button ${
                region === 'all'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setRegion('cn')}
              className={`segmented-button ${
                region === 'cn'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              国内
            </button>
            <button
              onClick={() => setRegion('intl')}
              className={`segmented-button ${
                region === 'intl'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              国际
            </button>
          </div>

          {/* Topic Filter */}
          <div className="segmented-control">
            <button
              onClick={() => setTopic('all')}
              className={`segmented-button ${
                topic === 'all'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              综合
            </button>
            <button
              onClick={() => setTopic('tech')}
              className={`segmented-button ${
                topic === 'tech'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              科技
            </button>
            <button
              onClick={() => setTopic('ai')}
              className={`segmented-button ${
                topic === 'ai'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              AI
            </button>
            <button
              onClick={() => setTopic('finance')}
              className={`segmented-button ${
                topic === 'finance'
                  ? 'segmented-button-active'
                  : 'hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              财经
            </button>
          </div>
        </div>
      </div>

      <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400 space-y-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: extractedColors?.secondary || '#10b981' }} />
            <p className="text-sm">正在聚合全网资讯...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-red-500 text-sm">
            {error}
          </div>
        ) : news.length > 0 ? (
          <ul className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {news.map((item, idx) => (
              <li key={idx} className="group py-4 first:pt-0">
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0 transition-colors" style={{ backgroundColor: extractedColors?.secondary || '#10b981' }} />
                    <div className="flex-1 min-w-0">
                      <h3 className="line-clamp-2 text-[15px] font-medium leading-snug text-zinc-900 transition-colors group-hover:text-[rgb(var(--theme-primary))] dark:text-zinc-100">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                        <span className="font-medium">
                          {item.source}
                        </span>
                        <span>{format(new Date(item.pubDate), 'HH:mm')}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center justify-center h-40 text-zinc-400 text-sm border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            暂无最新资讯
          </div>
        )}
      </div>
    </div>
  );
}
