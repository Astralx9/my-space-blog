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
          className="theme-text-primary hover:underline"
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
    <article className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center gap-2 text-zinc-500 dark:text-zinc-400"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(`/editor/${post.id}`)} className="p-2 theme-text-primary theme-bg-primary-soft rounded-full transition-colors" title="编辑文章">
            <Pencil className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors" title="删除文章">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <header className="mb-10 border-b border-zinc-100 dark:border-zinc-800 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <span 
            className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1.5 ${
              isLearning 
                ? 'theme-bg-primary-soft theme-text-primary'
                : 'theme-bg-secondary-soft theme-text-secondary'
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

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
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
            a: ({ node, ...props }) => { void node; return <a className="theme-text-primary hover:underline" {...props} />; },
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
