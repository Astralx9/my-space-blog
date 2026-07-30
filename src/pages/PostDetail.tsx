import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Book, Trash2, Pencil, Tag } from 'lucide-react';

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const posts = useStore((state) => state.posts);
  const deletePost = useStore((state) => state.deletePost);

  const post = posts.find((p) => p.id === id);

  if (!post) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">文章不存在或已被删除</h2>
        <button 
          onClick={() => navigate('/posts')}
          className="text-blue-500 hover:underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  const isLearning = post.category === 'learning';

  const handleDelete = async () => {
    if (window.confirm('确定要删除这篇记录吗？此操作不可恢复。')) {
      try {
        await deletePost(post.id);
        navigate('/posts');
      } catch (error) {
        console.error('Failed to delete post:', error);
        window.alert('删除失败，请检查网络后重试。');
      }
    }
  };

  return (
    <article className="page-enter mx-auto max-w-5xl pb-20">
      <div className="flex min-h-[26vh] items-end justify-between pb-8 text-white">
        <button 
          onClick={() => navigate(-1)}
          className="flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 text-sm font-semibold text-white transition hover:bg-black/25"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/editor/${post.id}`)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/15 text-white transition hover:bg-black/25" title="编辑文章">
            <Pencil className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/15 text-white transition hover:bg-red-500" title="删除文章">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="apple-surface rounded-[2.75rem] p-7 sm:p-10 md:p-16">
      <header className="mb-12 border-b border-black/[0.07] pb-10 dark:border-white/[0.09]">
        <div className="flex items-center gap-3 mb-6">
          <span 
            className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
              isLearning 
                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
            }`}
          >
            {isLearning ? <Book className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {isLearning ? '学习记录' : '个人日记'}
          </span>
          <span className="text-sm text-zinc-400 flex items-center gap-1.5">
            发布于 {format(post.createdAt, 'yyyy年MM月dd日 HH:mm')}
          </span>
          {post.isDraft && <span className="text-sm text-amber-600">草稿</span>}
        </div>

        <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.055em] text-zinc-900 dark:text-zinc-100 md:text-7xl">
          {post.title}
        </h1>
        {post.tags.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-zinc-500"><Tag className="w-4 h-4" />{post.tags.map((tag) => <span key={tag} className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800">#{tag}</span>)}</div>
        )}
      </header>

      <div className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ node, ...props }) => { void node; return <img {...props} className="rounded-2xl max-w-full h-auto shadow-md my-8" alt={props.alt || 'article image'} />; },
            h1: ({ node, ...props }) => { void node; return <h1 className="text-3xl font-bold mt-12 mb-6" {...props} />; },
            h2: ({ node, ...props }) => { void node; return <h2 className="text-2xl font-bold mt-10 mb-5" {...props} />; },
            p: ({ node, ...props }) => { void node; return <p className="leading-relaxed mb-6" {...props} />; },
            a: ({ node, ...props }) => { void node; return <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />; },
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
      </div>
    </article>
  );
}
