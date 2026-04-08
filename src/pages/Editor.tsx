import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, Category } from '../store/useStore';
import { Image as ImageIcon, Send, ArrowLeft, Loader2 } from 'lucide-react';

export default function Editor() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('diary');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const addPost = useStore((state) => state.addPost);
  const navigate = useNavigate();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const imageMarkdown = `\n![${file.name}](${base64})\n`;
      setContent((prev) => prev + imageMarkdown);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);
    // Simulate slight delay for UX
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    addPost({
      title,
      content,
      category,
    });
    
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">撰写新记录</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="文章标题..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-0 px-0"
            required
          />

          <div className="flex items-center gap-4 py-4 border-y border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCategory('diary')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === 'diary'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                个人日记
              </button>
              <button
                type="button"
                onClick={() => setCategory('learning')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === 'learning'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                学习记录
              </button>
            </div>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              插入图片
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <textarea
            placeholder="从这里开始撰写正文 (支持 Markdown)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[50vh] min-h-[300px] bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-0 px-0 resize-none text-lg leading-relaxed"
            required
          />
        </div>

        <div className="flex justify-end pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="submit"
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 focus:ring-4 focus:ring-zinc-200 dark:focus:ring-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            发布文章
          </button>
        </div>
      </form>
    </div>
  );
}
