import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, PenLine, Search } from 'lucide-react';
import { useStore, type Category } from '../store/useStore';
import PostCard from '../components/PostCard';

export default function Posts() {
  const posts = useStore((state) => state.posts);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');
  const draftCount = posts.filter((post) => post.isDraft).length;

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = filter === 'all' || post.category === filter;
      const matchesSearch = !normalizedSearch
        || post.title.toLowerCase().includes(normalizedSearch)
        || post.content.toLowerCase().includes(normalizedSearch)
        || post.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
      return matchesCategory && matchesSearch;
    });
  }, [posts, filter, search]);

  return (
    <div className="page-enter space-y-14 md:space-y-20">
      <header className="flex min-h-[42vh] flex-col justify-end text-white">
        <p className="hero-text-shadow mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Journal</p>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <h1 className="page-title hero-text-shadow">所有记录。</h1>
            <p className="hero-text-shadow mt-6 max-w-2xl text-lg font-medium text-white/85 md:text-xl">
              {posts.length} 篇文章，{draftCount} 篇仍在酝酿。把日常和学习，整理成可回看的时间。
            </p>
          </div>
          <Link to="/editor" className="apple-button w-fit bg-white !text-zinc-950 !shadow-xl">
            <PenLine className="h-4 w-4" />
            写新记录
          </Link>
        </div>
      </header>

      <section className="apple-surface rounded-[2.5rem] p-5 sm:p-7">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              placeholder="搜索标题、正文或标签"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="apple-input pl-11"
            />
          </div>

          <div className="segmented-control w-fit">
            {([
              ['all', '全部'],
              ['diary', '日记'],
              ['learning', '学习'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`segmented-button ${filter === value ? 'segmented-button-active' : 'hover:text-zinc-900 dark:hover:text-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredPosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="apple-surface flex min-h-80 flex-col items-center justify-center rounded-[2.5rem] p-10 text-center">
            <p className="text-xl font-semibold">没有找到匹配的记录。</p>
            <button onClick={() => { setSearch(''); setFilter('all'); }} className="mt-4 flex items-center gap-1 text-sm font-semibold text-zinc-500 hover:text-zinc-950 dark:hover:text-white">
              清除筛选
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
