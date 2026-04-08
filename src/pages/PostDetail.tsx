import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Book, Trash2 } from 'lucide-react';

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

  const handleDelete = () => {
    if (window.confirm('确定要删除这篇记录吗？此操作不可恢复。')) {
      deletePost(post.id);
      navigate('/posts');
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
        
        <button
          onClick={handleDelete}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
          title="删除文章"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <header className="mb-10 border-b border-zinc-100 dark:border-zinc-800 pb-8">
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
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          {post.title}
        </h1>
      </header>

      <div className="prose prose-zinc dark:prose-invert prose-lg max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({node, ...props}) => (
              <img 
                {...props} 
                className="rounded-2xl max-w-full h-auto shadow-md my-8" 
                alt={props.alt || 'article image'} 
              />
            ),
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-12 mb-6" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-10 mb-5" {...props} />,
            p: ({node, ...props}) => <p className="leading-relaxed mb-6" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline" {...props} />,
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>
    </article>
  );
}
