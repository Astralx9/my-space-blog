import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore, type Category } from '../store/useStore';
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, Save, Send } from 'lucide-react';
import { compressImageInWorker } from '../lib/imageWorker';
import { dataUrlToBlob, uploadBlogImage } from '../lib/mediaStorage';

type Status = { kind: 'idle' | 'uploading' | 'success' | 'error'; message?: string };

const parseTags = (value: string) => [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const posts = useStore((state) => state.posts);
  const addPost = useStore((state) => state.addPost);
  const updatePost = useStore((state) => state.updatePost);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('diary');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Status>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const existingPost = posts.find((post) => post.id === id);
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!existingPost) return;
    setTitle(existingPost.title);
    setContent(existingPost.content);
    setCategory(existingPost.category);
    setTags(existingPost.tags.join(', '));
  }, [existingPost]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadStatus({ kind: 'uploading', message: '正在压缩并上传图片…' });
      const compressedImage = await compressImageInWorker(file);
      const blob = await dataUrlToBlob(compressedImage);
      if (blob.size > 2_500_000) throw new Error('压缩后仍超过 2.5MB，请选择更小的图片');
      const uploaded = await uploadBlogImage(blob, 'inline');
      setContent((previous) => `${previous}\n![${file.name}](${uploaded.url})\n`);
      setUploadStatus({ kind: 'success', message: '图片已插入正文' });
    } catch (error) {
      console.error('Inline image upload failed:', error);
      const message = error instanceof Error ? error.message : '图片处理失败，请重试';
      setUploadStatus({ kind: 'error', message });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const savePost = async (isDraft: boolean) => {
    if (!title.trim()) {
      setUploadStatus({ kind: 'error', message: '请先填写文章标题' });
      return;
    }
    if (!isDraft && !content.trim()) {
      setUploadStatus({ kind: 'error', message: '发布文章前请填写正文，或先保存为草稿' });
      return;
    }

    setIsSubmitting(true);
    try {
      const postData = { title: title.trim(), content, category, tags: parseTags(tags), isDraft };
      if (existingPost) await updatePost(existingPost.id, postData);
      else await addPost(postData);
      navigate(isDraft ? '/posts' : '/');
    } catch (error) {
      console.error('Failed to save post:', error);
      const message = error instanceof Error ? error.message : '保存失败，请检查网络后重试';
      setUploadStatus({ kind: 'error', message });
      setIsSubmitting(false);
    }
  };

  if (isEditing && !existingPost) {
    return (
      <div className="py-20 text-center">
        <p className="text-zinc-500">正在加载文章，或文章不存在。</p>
        <button onClick={() => navigate('/posts')} className="mt-4 theme-text-primary hover:underline">返回文章列表</button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? '编辑记录' : '撰写新记录'}</h1>
          {existingPost?.isDraft && <p className="text-sm text-amber-600 mt-1">当前为草稿，发布后才会出现在首页。</p>}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="文章标题…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-0 px-0"
          />

          <div className="flex flex-wrap items-center gap-4 py-4 border-y border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-2">
              {(['diary', 'learning'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === item ? (item === 'diary' ? 'theme-bg-secondary text-white shadow-sm' : 'theme-bg-primary text-white shadow-sm') : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                >
                  {item === 'diary' ? '个人日记' : '学习记录'}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus.kind === 'uploading'}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploadStatus.kind === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
              插入图片
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/png,image/jpeg,image/webp" className="hidden" />
          </div>

          <input
            type="text"
            placeholder="标签，用逗号分隔，例如：React, 学习, 周记"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent outline-none focus:ring-2 theme-focus"
          />

          {uploadStatus.kind !== 'idle' && (
            <p className={`text-sm ${uploadStatus.kind === 'error' ? 'text-red-600' : uploadStatus.kind === 'success' ? 'theme-text-secondary' : 'theme-text-primary'}`} role={uploadStatus.kind === 'error' ? 'alert' : 'status'}>
              {uploadStatus.message}
            </p>
          )}

          <textarea
            placeholder="从这里开始撰写正文（支持 Markdown）…"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="w-full h-[50vh] min-h-[300px] bg-transparent border-none outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700 focus:ring-0 px-0 resize-none text-lg leading-relaxed"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => savePost(true)}
            disabled={!title.trim() || isSubmitting}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            保存草稿
          </button>
          <button
            type="button"
            onClick={() => savePost(false)}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? <FileText className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            {isEditing ? '保存并发布' : '发布文章'}
          </button>
        </div>
      </div>
    </div>
  );
}
