import { useState, useMemo } from 'react';
import { useStore, Category } from '../store/useStore';
import PostCard from '../components/PostCard';
import { Search } from 'lucide-react';

export default function Posts() {
  const posts = useStore((state) => state.posts);
  const [filter, setFilter] = useState<'all' | Category>('all');
  const [search, setSearch] = useState('');

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchCategory = filter === 'all' || post.category === filter;
      const matchSearch = post.title.toLowerCase().includes(search.toLowerCase()) || 
                          post.content.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [posts, filter, search]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">所有记录</h1>
          <p className="text-zinc-500 dark:text-zinc-400">总计 {posts.length} 篇文章</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="搜索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white/[var(--component-bg-alpha)] dark:bg-zinc-900/[var(--component-bg-alpha)] backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex bg-zinc-100/[var(--component-bg-alpha)] dark:bg-zinc-900/[var(--component-bg-alpha)] backdrop-blur-sm p-1 rounded-xl">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('diary')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'diary'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              日记
            </button>
            <button
              onClick={() => setFilter('learning')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === 'learning'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              学习
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <p className="text-zinc-500">没有找到匹配的记录。</p>
          </div>
        )}
      </div>
    </div>
  );
}
