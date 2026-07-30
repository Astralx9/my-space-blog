import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowDown, ArrowUpRight, Newspaper, Scale } from 'lucide-react';
import {
  Area,
  AreaChart,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useStore } from '../store/useStore';
import PostCard from '../components/PostCard';

export default function Home() {
  const posts = useStore((state) => state.posts);
  const photos = useStore((state) => state.photos);
  const extractedColors = useStore((state) => state.extractedColors);
  const publishedPosts = useMemo(() => posts.filter((post) => !post.isDraft), [posts]);
  const recentPosts = publishedPosts.slice(0, 3);

  const stats = useMemo(() => {
    let diary = 0;
    let learning = 0;
    const monthlyData: Record<string, { label: string; count: number }> = {};

    publishedPosts.forEach((post) => {
      if (post.category === 'diary') diary += 1;
      if (post.category === 'learning') learning += 1;
      const date = new Date(post.createdAt);
      const monthKey = format(date, 'yyyy-MM');
      monthlyData[monthKey] = {
        label: format(date, 'M月'),
        count: (monthlyData[monthKey]?.count || 0) + 1,
      };
    });

    return {
      diary,
      learning,
      monthlyChartData: Object.entries(monthlyData)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([, value]) => ({ name: value.label, count: value.count }))
        .slice(-6),
    };
  }, [publishedPosts]);

  const compositionData = [
    { name: '日记', value: stats.diary, color: extractedColors?.secondary || '#34c759' },
    { name: '学习', value: stats.learning, color: extractedColors?.primary || '#0071e3' },
  ];

  return (
    <div className="page-enter space-y-24 md:space-y-32">
      <section className="flex min-h-[calc(100svh-8rem)] max-w-6xl flex-col justify-end pb-10 text-white md:min-h-[calc(100svh-6rem)] md:pb-16">
        <p className="hero-text-shadow mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
          Personal archive · {photos.length} moments
        </p>
        <h1 className="display-title hero-text-shadow max-w-6xl">
          留住此刻，
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: extractedColors
                ? `linear-gradient(100deg, #fff 5%, ${extractedColors.secondary} 88%)`
                : 'linear-gradient(100deg, #fff 5%, #c7e4ff 88%)',
            }}
          >
            也留住自己。
          </span>
        </h1>
        <div className="mt-10 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <p className="hero-text-shadow max-w-xl text-lg font-medium leading-relaxed text-white/90 md:text-2xl">
            本来无一物，何处惹尘埃。
          </p>
          <a
            href="#today"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/35 bg-black/15 text-white backdrop-blur-md transition hover:translate-y-1 hover:bg-black/25"
            aria-label="继续浏览首页内容"
          >
            <ArrowDown className="h-5 w-5" />
          </a>
        </div>
      </section>

      <section id="today" className="scroll-mt-10 space-y-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-4">Today</p>
            <h2 className="section-title max-w-3xl">今天，先看看发生了什么。</h2>
          </div>
          <Link to="/editor" className="apple-button-secondary w-fit">
            写下此刻
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Link to="/news" className="apple-surface apple-surface-interactive group rounded-[2.5rem] p-7 sm:p-10">
            <Newspaper className="h-7 w-7 text-[rgb(var(--theme-primary))]" />
            <p className="eyebrow mt-10">News</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 dark:text-white">新闻资讯</h3>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-500 dark:text-zinc-400">多源官方 RSS，真实来源与链接都在独立新闻页中。</p>
            <span className="mt-9 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 transition group-hover:text-[rgb(var(--theme-primary))] dark:text-zinc-300">
              查看新闻 <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>

          <Link to="/weight" className="apple-surface apple-surface-interactive group rounded-[2.5rem] p-7 sm:p-10">
            <Scale className="h-7 w-7 text-[rgb(var(--theme-secondary))]" />
            <p className="eyebrow mt-10">Body metrics</p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-zinc-950 dark:text-white">体重记录器</h3>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-500 dark:text-zinc-400">把数据与趋势留在独立页面，专注记录每一次变化。</p>
            <span className="mt-9 inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 transition group-hover:text-[rgb(var(--theme-primary))] dark:text-zinc-300">
              打开记录器 <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      <section className="space-y-10">
        <div>
          <p className="eyebrow mb-4">Patterns</p>
          <h2 className="section-title">让记录形成自己的节奏。</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="apple-surface apple-surface-interactive rounded-[2.5rem] p-7 sm:p-10 lg:col-span-2">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">近半年发布趋势</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                  {publishedPosts.length}<span className="ml-2 text-base font-medium text-zinc-400">篇记录</span>
                </p>
              </div>
              <span className="rounded-full bg-[rgb(var(--theme-primary)/0.10)] px-3 py-2 text-xs font-semibold text-[rgb(var(--theme-primary))]">真实发布数据</span>
            </div>
            <div className="h-72 w-full overflow-hidden rounded-[1.75rem] border border-black/[0.05] bg-gradient-to-br from-white/80 to-[rgb(var(--theme-primary)/0.08)] p-3 dark:border-white/10 dark:from-white/[0.06] dark:to-[rgb(var(--theme-primary)/0.14)]">
              {stats.monthlyChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyChartData} margin={{ top: 18, right: 8, bottom: 0, left: 8 }}>
                    <defs>
                      <linearGradient id="publication-trend-fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={extractedColors?.primary || '#0071e3'} stopOpacity={0.34} />
                        <stop offset="100%" stopColor={extractedColors?.primary || '#0071e3'} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={8} />
                    <Tooltip cursor={{ stroke: extractedColors?.primary || '#0071e3', strokeOpacity: 0.25, strokeDasharray: '4 5' }} contentStyle={{ borderRadius: '16px', border: '1px solid rgb(0 0 0 / 0.08)', boxShadow: '0 16px 36px rgb(0 0 0 / 0.14)', background: 'rgb(255 255 255 / 0.92)', padding: '10px 12px' }} labelStyle={{ color: '#71717a', fontSize: 12, marginBottom: 3 }} formatter={(value: number) => [`${value} 篇`, '发布']} />
                    <Area type="monotone" dataKey="count" stroke={extractedColors?.primary || '#0071e3'} strokeWidth={3} fill="url(#publication-trend-fill)" dot={{ r: 4, fill: extractedColors?.primary || '#0071e3', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: extractedColors?.primary || '#0071e3', stroke: '#fff', strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : stats.monthlyChartData.length === 1 ? <div className="flex h-full flex-col items-center justify-center text-center"><span className="mb-4 h-4 w-4 rounded-full bg-[rgb(var(--theme-primary))] ring-8 ring-[rgb(var(--theme-primary)/0.12)]" /><p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{stats.monthlyChartData[0].name} · {stats.monthlyChartData[0].count} 篇</p><p className="mt-2 text-sm text-zinc-500">再积累一个月份，趋势会自然出现。</p></div> : <div className="flex h-full items-center justify-center text-sm text-zinc-400">发布第一篇记录后，这里会开始形成趋势。</div>}
            </div>
          </div>

          <div className="apple-surface apple-surface-interactive rounded-[2.5rem] p-7 sm:p-10">
            <p className="text-sm font-semibold text-zinc-500">内容占比</p>
            <div className="mt-7 rounded-[1.75rem] border border-black/[0.05] bg-white/45 p-5 dark:border-white/10 dark:bg-white/[0.04]">
              {publishedPosts.length > 0 ? (
                <div className="space-y-6">
                  <div><span className="text-5xl font-semibold tracking-[-0.06em]">{publishedPosts.length}</span><span className="ml-2 text-sm font-medium text-zinc-500">篇总记录</span></div>
                  {compositionData.map((item) => {
                    const percentage = Math.round((item.value / publishedPosts.length) * 100);
                    return <div key={item.name} className="space-y-2.5"><div className="flex items-center justify-between text-sm"><span className="font-semibold text-zinc-700 dark:text-zinc-200">{item.name}</span><span className="text-zinc-500">{item.value} 篇 · {percentage}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-zinc-200/70 dark:bg-white/10"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${percentage}%`, backgroundColor: item.color }} /></div></div>;
                  })}
                </div>
              ) : <div className="flex h-52 items-center justify-center text-sm text-zinc-400">暂无内容数据</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="eyebrow mb-4">Latest stories</p>
            <h2 className="section-title">最近写下的故事。</h2>
          </div>
          <Link to="/posts" className="hidden items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 sm:flex dark:text-zinc-300 dark:hover:text-white">
            查看全部 <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {recentPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recentPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="apple-surface rounded-[2.5rem] p-16 text-center">
            <p className="mb-4 text-zinc-500">还没有任何记录，快去发布第一篇文章吧！</p>
          </div>
        )}
      </section>
    </div>
  );
}

