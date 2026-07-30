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
        <button onClick={() => navigate('/posts')} className="mt-4 text-blue-600 hover:underline">返回文章列表</button>
      </div>
    );
  }

  return (
    <div className="page-enter mx-auto max-w-5xl">
      <header className="flex min-h-[34vh] items-end justify-between gap-6 pb-10 text-white">
        <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/15 transition hover:bg-black/25" aria-label="返回">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="hero-text-shadow mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">Editor</p>
          <h1 className="hero-text-shadow text-4xl font-semibold tracking-[-0.045em] md:text-6xl">{isEditing ? '继续打磨。' : '写下此刻。'}</h1>
          {existingPost?.isDraft && <p className="hero-text-shadow mt-2 text-sm text-amber-200">当前为草稿，发布后才会出现在首页。</p>}
        </div>
      </div>
      </header>

      <div className="apple-surface space-y-8 rounded-[2.75rem] p-7 sm:p-10 md:p-14">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="文章标题…"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full border-none bg-transparent px-0 text-4xl font-semibold tracking-[-0.05em] outline-none placeholder:text-zinc-300 focus:ring-0 dark:placeholder:text-zinc-700 md:text-6xl"
          />

          <div className="flex flex-wrap items-center gap-4 border-y border-black/[0.07] py-5 dark:border-white/[0.09]">
            <div className="segmented-control">
              {(['diary', 'learning'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`segmented-button ${category === item ? 'segmented-button-active' : 'hover:text-zinc-900 dark:hover:text-white'}`}
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
              className="apple-button-secondary min-h-9 px-4 py-1.5"
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
            className="apple-input"
          />

          {uploadStatus.kind !== 'idle' && (
            <p className={`text-sm ${uploadStatus.kind === 'error' ? 'text-red-600' : uploadStatus.kind === 'success' ? 'text-emerald-600' : 'text-blue-600'}`} role={uploadStatus.kind === 'error' ? 'alert' : 'status'}>
              {uploadStatus.message}
            </p>
          )}

          <textarea
            placeholder="从这里开始撰写正文（支持 Markdown）…"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[28rem] w-full resize-none border-none bg-transparent px-0 text-lg leading-[1.85] outline-none placeholder:text-zinc-300 focus:ring-0 dark:placeholder:text-zinc-700"
          />
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-black/[0.07] pt-7 dark:border-white/[0.09]">
          <button
            type="button"
            onClick={() => savePost(true)}
            disabled={!title.trim() || isSubmitting}
            className="apple-button-secondary"
          >
            <Save className="w-5 h-5" />
            保存草稿
          </button>
          <button
            type="button"
            onClick={() => savePost(false)}
            disabled={!title.trim() || !content.trim() || isSubmitting}
            className="apple-button"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditing ? <FileText className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            {isEditing ? '保存并发布' : '发布文章'}
          </button>
        </div>
      </div>
    </div>
  );
}
