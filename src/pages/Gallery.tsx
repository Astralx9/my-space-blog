import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { CalendarDays, ImagePlus, Loader2, MapPin, Palette, Save, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { compressImageInWorker } from '../lib/imageWorker';
import { extractImageColors } from '../lib/extractImageColors';
import { MediaUploadError } from '../lib/mediaStorage';
import type { Photo } from '../store/useStore';

type UploadStage = 'queued' | 'compressing' | 'uploading' | 'saving' | 'success' | 'error';
type UploadItem = { id: string; name: string; stage: UploadStage; progress: number; message?: string };
type PhotoAspect = 'landscape' | 'standard' | 'portrait';

const mosaicClasses: Record<PhotoAspect, string> = {
  landscape: 'col-span-2 aspect-[3/2] md:col-span-6 md:row-span-4 md:aspect-auto',
  standard: 'col-span-2 aspect-[4/3] md:col-span-4 md:row-span-3 md:aspect-auto',
  portrait: 'col-span-1 aspect-[2/3] md:col-span-3 md:row-span-5 md:aspect-auto',
};

const stageLabel: Record<UploadStage, string> = {
  queued: '等待中',
  compressing: '正在压缩',
  uploading: '正在上传',
  saving: '正在保存记录',
  success: '完成',
  error: '失败',
};

const uploadErrorMessage = (error: unknown) => {
  if (!navigator.onLine) return '当前网络不可用，请恢复网络后重试';
  if (error instanceof MediaUploadError) return error.message;

  const details = error && typeof error === 'object'
    ? error as { code?: string; status?: number }
    : undefined;
  if (details?.code === '42501' || details?.status === 403) return '当前账号没有上传或保存图片的权限，请重新登录后重试';
  if (details?.status === 401) return '登录状态已失效，请重新登录后上传';
  if (details?.status === 413) return '图片超过大小限制，请选择更小的图片';
  if (details?.code === 'PGRST204') return '网站的数据结构尚未同步，请刷新页面后重试';

  const message = error instanceof Error ? error.message : '';
  if (message.includes('仅支持') || message.includes('压缩后') || message.includes('登录') || message.includes('图片文件已上传')) return message;
  if (/failed to fetch|network|fetch/i.test(message)) return '无法连接图片服务，请检查网络或刷新页面后重试';
  return '上传未完成，请刷新页面后重试；若仍失败，请联系管理员并附上上传时间';
};

const getImageColors = (file: File) => new Promise<{ primary: string; secondary: string } | null>((resolve) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    try {
      resolve(extractImageColors(image));
    } catch {
      resolve(null);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(null);
  };
  image.src = objectUrl;
});

export default function Gallery() {
  const photos = useStore((state) => state.photos);
  const addPhoto = useStore((state) => state.addPhoto);
  const setPhotoColors = useStore((state) => state.setPhotoColors);
  const updatePhotoMetadata = useStore((state) => state.updatePhotoMetadata);
  const deletePhoto = useStore((state) => state.deletePhoto);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  const [isUploading, setIsUploading] = useState(false);
  const [photoAspects, setPhotoAspects] = useState<Record<string, PhotoAspect>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [metadata, setMetadata] = useState({ takenAt: '', location: '', story: '' });
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayPhotos = photos;

  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPhoto(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedPhoto]);

  const updateItem = (id: string, update: Partial<UploadItem>) => {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  };

  const uploadFiles = async (fileList: FileList | File[]) => {
    if (isUploading) return;
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const items = files.map((file) => ({ id: crypto.randomUUID(), name: file.name, stage: 'queued' as const, progress: 0 }));
    setQueue(items);
    setNotice({ kind: 'idle' });
    setIsUploading(true);
    let succeeded = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const item = items[index];
      try {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error('仅支持 JPG、PNG 或 WebP 图片');
        }
        updateItem(item.id, { stage: 'compressing', progress: 15 });
        const compressedImage = await compressImageInWorker(file);
        if (compressedImage.length > 2_500_000) throw new Error('压缩后仍超过 2.5MB，请选择更小的图片');

        updateItem(item.id, { stage: 'uploading', progress: 55 });
        const colors = await getImageColors(file);
        updateItem(item.id, { stage: 'saving', progress: 80 });
        await addPhoto({ compressedImage, extractedColors: colors });
        updateItem(item.id, { stage: 'success', progress: 100 });
        succeeded += 1;
      } catch (error) {
        const message = uploadErrorMessage(error);
        console.error(`Photo upload failed for ${file.name}:`, error);
        updateItem(item.id, { stage: 'error', progress: 100, message });
      }
    }

    setIsUploading(false);
    setNotice(succeeded === files.length
      ? { kind: 'success', message: `${succeeded} 张图片已上传到作品集` }
      : { kind: 'error', message: `${succeeded}/${files.length} 张图片上传成功，请查看失败项后重试` });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const backfillPhotoColors = async (photo: Photo) => {
    const image = new Image();
    image.onload = async () => {
      try {
        const colors = extractImageColors(image);
        if (!colors) throw new Error('No usable colors found');
        await setPhotoColors(photo.id, colors);
        setNotice({ kind: 'success', message: '配色已保存' });
      } catch (error) {
        console.error('Failed to backfill image colors:', error);
        setNotice({ kind: 'error', message: '配色生成失败，请重试' });
      }
    };
    image.onerror = () => setNotice({ kind: 'error', message: '图片加载失败，无法生成配色' });
    image.src = photo.url;
  };

  const detectAspect = (photoId: string, image: HTMLImageElement) => {
    const ratio = image.naturalWidth / image.naturalHeight;
    const aspect: PhotoAspect = ratio >= 1.45 ? 'landscape' : ratio <= 0.82 ? 'portrait' : 'standard';
    setPhotoAspects((current) => current[photoId] === aspect ? current : { ...current, [photoId]: aspect });
  };

  const openPhoto = (photo: Photo) => {
    setSelectedPhoto(photo);
    setMetadata({
      takenAt: photo.takenAt ? format(new Date(photo.takenAt), 'yyyy-MM-dd') : '',
      location: photo.location || '',
      story: photo.story || '',
    });
    setMetadataError('');
  };

  const saveMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPhoto || isSavingMetadata) return;
    setMetadataError('');
    setIsSavingMetadata(true);
    try {
      const nextMetadata = {
        takenAt: metadata.takenAt ? new Date(`${metadata.takenAt}T12:00:00`).toISOString() : null,
        location: metadata.location,
        story: metadata.story,
      };
      await updatePhotoMetadata(selectedPhoto.id, nextMetadata);
      setSelectedPhoto((current) => current ? { ...current, ...nextMetadata, location: nextMetadata.location.trim() || null, story: nextMetadata.story.trim() || null } : current);
      setNotice({ kind: 'success', message: '作品备注已保存' });
    } catch (error) {
      console.error('Failed to save photo metadata:', error);
      setMetadataError('备注未保存成功，请检查网络后重试。');
    } finally {
      setIsSavingMetadata(false);
    }
  };

  return (
    <div className="page-enter space-y-14 md:space-y-20">
      <header className="flex min-h-[42vh] flex-col justify-end text-white">
        <p className="hero-text-shadow mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">Photography</p>
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
        <div>
          <h1 className="page-title hero-text-shadow">摄影作品。</h1>
          <p className="hero-text-shadow mt-6 max-w-2xl text-lg font-medium text-white/85 md:text-xl">
            {photos.length} 个被定格的瞬间。它们会成为整个空间的背景与色彩。
          </p>
        </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="apple-button w-fit bg-white !text-zinc-950 !shadow-xl"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            批量上传作品
          </button>
        <input type="file" ref={fileInputRef} onChange={(event) => uploadFiles(event.target.files || [])} accept="image/jpeg,image/png,image/webp" multiple className="hidden" />
        </div>
      </header>

      {(queue.length > 0 || notice.kind !== 'idle') && (
        <section className="apple-surface space-y-4 rounded-[2rem] p-6" aria-live="polite">
          {queue.map((item) => (
            <div key={item.id} className="space-y-1.5">
              <div className="flex justify-between gap-4 text-sm">
                <span className="truncate font-medium">{item.name}</span>
                <span className={item.stage === 'error' ? 'text-red-600' : item.stage === 'success' ? 'text-emerald-600' : 'text-zinc-500'}>{stageLabel[item.stage]}{item.message ? `：${item.message}` : ''}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div className={`${item.stage === 'error' ? 'bg-red-500' : item.stage === 'success' ? 'bg-emerald-500' : 'bg-blue-500'} h-full transition-all duration-300`} style={{ width: `${item.progress}%` }} />
              </div>
            </div>
          ))}
          {notice.kind !== 'idle' && (
            <p role={notice.kind === 'error' ? 'alert' : 'status'} className={notice.kind === 'error' ? 'text-sm text-red-600' : 'text-sm text-emerald-600'}>{notice.message}</p>
          )}
        </section>
      )}

      {displayPhotos.length > 0 ? (
        <section className="grid grid-flow-dense grid-cols-2 gap-4 md:auto-rows-[5rem] md:grid-cols-12 md:gap-5" aria-label="摄影作品拼图墙">
          {displayPhotos.map((photo) => (
            <article key={photo.id} role="button" tabIndex={0} onClick={() => openPhoto(photo)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPhoto(photo); } }} className={`group relative cursor-zoom-in overflow-hidden rounded-[1.75rem] bg-zinc-100 shadow-[0_18px_55px_rgb(0_0_0/0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgb(0_0_0/0.24)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white dark:bg-zinc-900 ${mosaicClasses[photoAspects[photo.id] || 'standard']}`} aria-label="查看摄影作品大图与备注">
              <img src={photo.url} onLoad={(event) => detectAspect(photo.id, event.currentTarget)} alt="摄影作品" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/25 via-transparent to-black/65 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="flex justify-end">
                  {!photo.extractedColors && <button onClick={(event) => { event.stopPropagation(); void backfillPhotoColors(photo); }} className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-blue-500" title="补齐图片配色"><Palette className="w-4 h-4" /></button>}
                  <button onClick={(event) => { event.stopPropagation(); if (window.confirm('确定要删除这张照片吗？')) void deletePhoto(photo.id).catch(() => setNotice({ kind: 'error', message: '删除失败，请重试' })); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-red-500" title="删除图片"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="text-xs font-medium text-white drop-shadow-md">点击查看大图与作品故事 · 上传于 {format(photo.createdAt, 'yyyy-MM-dd')}</div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="apple-surface flex min-h-96 flex-col items-center justify-center rounded-[2.5rem] p-12 text-center">
          <ImagePlus className="w-8 h-8 text-zinc-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">还没有摄影作品</h3>
          <p className="text-zinc-500 max-w-sm">选择一张或多张作品开始上传。</p>
        </div>
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-[70] flex items-stretch p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="摄影作品详情" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPhoto(null); }}>
          <div className="relative mx-auto flex h-full w-full max-w-7xl overflow-hidden rounded-[2rem] border border-white/20 bg-white/[var(--surface-alpha)] shadow-[0_32px_100px_rgb(0_0_0/0.48)] backdrop-blur-2xl dark:bg-zinc-950/[var(--surface-alpha)] lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(22rem,0.75fr)]">
            <button type="button" onClick={() => setSelectedPhoto(null)} className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-white hover:text-zinc-950" aria-label="关闭大图查看"><X className="h-5 w-5" /></button>
            <div className="flex min-h-0 items-center justify-center bg-black/[var(--surface-alpha)] p-4 sm:p-8">
              <img src={selectedPhoto.url} alt="摄影作品大图" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
            </div>
            <form onSubmit={saveMetadata} className="flex min-h-0 flex-col overflow-y-auto bg-white/[var(--surface-alpha)] p-6 text-zinc-950 backdrop-blur-2xl dark:bg-zinc-950/[var(--surface-alpha)] dark:text-white sm:p-8">
              <p className="eyebrow mb-3">Photo note</p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em]">把这一刻留下来。</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">记录拍摄时的光线、地点与当下心情；这些信息只会写入你的作品记录。</p>
              <div className="mt-8 space-y-5">
                <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-[rgb(var(--theme-primary))]" />拍摄日期</span><input type="date" value={metadata.takenAt} onChange={(event) => setMetadata((current) => ({ ...current, takenAt: event.target.value }))} className="apple-input w-full" /><span className="mt-2 block text-xs text-zinc-500">可从日历选择，也可直接输入年月日。</span></label>
                <label className="block"><span className="mb-2 flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-[rgb(var(--theme-primary))]" />拍摄地点</span><input type="text" value={metadata.location} onChange={(event) => setMetadata((current) => ({ ...current, location: event.target.value }))} placeholder="例如：香港，旺角" maxLength={120} className="apple-input w-full" /></label>
                <label className="block"><span className="mb-2 block text-sm font-semibold">这张照片的故事</span><textarea value={metadata.story} onChange={(event) => setMetadata((current) => ({ ...current, story: event.target.value }))} placeholder="那天发生了什么？你为什么按下快门？" maxLength={2000} rows={7} className="apple-input min-h-40 w-full resize-y leading-relaxed" /></label>
              </div>
              {metadataError && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{metadataError}</p>}
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-zinc-200 pt-5 dark:border-white/10"><span className="text-xs text-zinc-500">上传于 {format(selectedPhoto.createdAt, 'yyyy-MM-dd')}</span><button type="submit" disabled={isSavingMetadata} className="apple-button">{isSavingMetadata ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isSavingMetadata ? '保存中' : '保存备注'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

