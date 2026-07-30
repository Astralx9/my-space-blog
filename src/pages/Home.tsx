import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Cell as PieCell,
} from 'recharts';
import { useStore } from '../store/useStore';
import PostCard from '../components/PostCard';
import WeightTracker from '../components/WeightTracker';
import NewsWidget from '../components/NewsWidget';

export default function Home() {
  const posts = useStore((state) => state.posts);
  const photos = useStore((state) => state.photos);
  const extractedColors = useStore((state) => state.extractedColors);
  const publishedPosts = useMemo(() => posts.filter((post) => !post.isDraft), [posts]);
  const recentPosts = publishedPosts.slice(0, 3);

  const stats = useMemo(() => {
    let diary = 0;
    let learning = 0;
    const monthlyData: Record<string, number> = {};

    publishedPosts.forEach((post) => {
      if (post.category === 'diary') diary += 1;
      if (post.category === 'learning') learning += 1;
      const month = format(new Date(post.createdAt), 'MMM');
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    return {
      diary,
      learning,
      monthlyChartData: Object.keys(monthlyData)
        .map((name) => ({ name, count: monthlyData[name] }))
        .slice(-6),
    };
  }, [publishedPosts]);

  const pieData = [
    { name: '日记', value: stats.diary, color: extractedColors?.secondary || '#34c759' },
    { name: '学习', value: stats.learning, color: extractedColors?.primary || '#0071e3' },
  ];

  return (
    <div className="page-enter space-y-24 md:space-y-32">
      <section className="flex min-h-[72vh] max-w-6xl flex-col justify-end pb-10 text-white md:min-h-[78vh] md:pb-16">
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
            aria-label="继续浏览"
          >
            <ArrowDown className="h-5 w-5" />
          </a>
        </div>
      </section>

      <section id="today" className="scroll-mt-10 space-y-10">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-4">Today</p>
            <h2 className="section-title max-w-3xl">今天，只看最值得关注的事。</h2>
          </div>
          <Link to="/editor" className="apple-button-secondary w-fit">
            写下此刻
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="min-h-[34rem] lg:col-span-8">
            <NewsWidget />
          </div>
          <div className="lg:col-span-4">
            <WeightTracker />
          </div>
        </div>
      </section>

      <section className="space-y-10">
        <div>
          <p className="eyebrow mb-4">Patterns</p>
          <h2 className="section-title">让记录形成自己的节奏。</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="apple-surface rounded-[2.5rem] p-7 sm:p-10 lg:col-span-2">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-500">近半年发布趋势</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
                  {publishedPosts.length}
                  <span className="ml-2 text-base font-medium text-zinc-400">篇记录</span>
                </p>
              </div>
            </div>
            <div className="h-72 w-full">
              {stats.monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyChartData}>
                    <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 12px 36px rgb(0 0 0 / 0.14)',
                      }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                      {stats.monthlyChartData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={extractedColors?.primary || '#0071e3'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">暂无数据</div>
              )}
            </div>
          </div>

          <div className="apple-surface rounded-[2.5rem] p-7 sm:p-10">
            <p className="text-sm font-semibold text-zinc-500">内容占比</p>
            <div className="relative mt-6 h-72 w-full">
              {publishedPosts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={92}
                      paddingAngle={4}
                      dataKey="value"
                      cornerRadius={8}
                    >
                      {pieData.map((entry, index) => (
                        <PieCell key={`${entry.name}-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">暂无数据</div>
              )}

              {publishedPosts.length > 0 && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-semibold tracking-[-0.04em]">{publishedPosts.length}</span>
                  <span className="text-xs font-medium text-zinc-500">总篇数</span>
                </div>
              )}
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
          <Link
            to="/posts"
            className="hidden items-center gap-1 text-sm font-semibold text-zinc-600 hover:text-zinc-950 sm:flex dark:text-zinc-300 dark:hover:text-white"
          >
            查看全部
            <ArrowUpRight className="h-4 w-4" />
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
