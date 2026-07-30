import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Post } from '../store/useStore';
import { Calendar, Book, Clock, Tag } from 'lucide-react';

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const isLearning = post.category === 'learning';
  
  // Extract a brief summary by stripping markdown or just taking first N chars
  const summary = post.content.replace(/[#*`~>]/g, '').substring(0, 120) + '...';

  return (
    <Link 
      to={`/post/${post.id}`}
      className="group block p-6 bg-white/[var(--component-bg-alpha)] dark:bg-zinc-900/[var(--component-bg-alpha)] backdrop-blur-sm border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-4">
        <span 
          className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
            isLearning 
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' 
              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
          }`}
        >
          {isLearning ? <Book className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
          {isLearning ? '学习记录' : '个人日记'}
        </span>
        <span className="text-xs text-zinc-400 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {format(post.createdAt, 'yyyy-MM-dd')}
        </span>
        {post.isDraft && <span className="text-xs font-medium text-amber-700 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 px-2 py-1 rounded-full">草稿</span>}
      </div>
      
      <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {post.title}
      </h3>
      
      <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed line-clamp-3">
        {summary}
      </p>
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
          <Tag className="w-3.5 h-3.5 mt-0.5" />
          {post.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
        </div>
      )}
    </Link>
  );
}
