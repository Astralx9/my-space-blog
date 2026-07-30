import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowUpRight, Book, Calendar, Clock } from 'lucide-react';
import type { Post } from '../store/useStore';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const isLearning = post.category === 'learning';
  const cleanContent = post.content.replace(/!\[[^\]]*]\([^)]*\)/g, '').replace(/[#*`~>]/g, '').trim();
  const summary = cleanContent.length > 120 ? `${cleanContent.slice(0, 120)}…` : cleanContent;

  return (
    <Link
      to={`/post/${post.id}`}
      className="apple-surface group flex min-h-[24rem] flex-col rounded-[2.25rem] p-7 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_30px_90px_rgb(0_0_0/0.14)] sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
          {isLearning ? <Book className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          {isLearning ? '学习记录' : '个人日记'}
        </span>
        <ArrowUpRight className="h-5 w-5 text-zinc-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-950 dark:group-hover:text-white" />
      </div>

      <div className="flex flex-1 flex-col justify-center py-10">
        <h3 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-zinc-950 transition dark:text-white">
          {post.title}
        </h3>
        {summary && (
          <p className="mt-5 line-clamp-3 text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
            {summary}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.07] pt-5 text-xs font-medium text-zinc-400 dark:border-white/[0.09]">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          {format(post.createdAt, 'yyyy.MM.dd')}
        </span>
        {post.isDraft && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">草稿</span>}
        {post.tags.slice(0, 2).map((tag) => <span key={tag}>#{tag}</span>)}
      </div>
    </Link>
  );
}
