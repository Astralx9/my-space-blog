import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { ImagePlus, Loader2, Palette, Trash2 } from 'lucide-react';
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
  const deletePhoto = useStore((state) => state.deletePhoto);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState<{ kind: 'idle' | 'success' | 'error'; message?: string }>({ kind: 'idle' });
  const [isUploading, setIsUploading] = useState(false);
  const [photoAspects, setPhotoAspects] = useState<Record<string, PhotoAspect>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayPhotos = photos;

  useEffect(() => () => undefined, []);

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
            <div key={photo.id} className={`group relative overflow-hidden rounded-[1.75rem] bg-zinc-100 shadow-[0_18px_55px_rgb(0_0_0/0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgb(0_0_0/0.24)] dark:bg-zinc-900 ${mosaicClasses[photoAspects[photo.id] || 'standard']}`}>
              <img src={photo.url} onLoad={(event) => detectAspect(photo.id, event.currentTarget)} alt="摄影作品" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/25 via-transparent to-black/65 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="flex justify-end">
                  {!photo.extractedColors && <button onClick={() => backfillPhotoColors(photo)} className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-blue-500" title="补齐图片配色"><Palette className="w-4 h-4" /></button>}
                  <button onClick={() => { if (window.confirm('确定要删除这张照片吗？')) void deletePhoto(photo.id).catch(() => setNotice({ kind: 'error', message: '删除失败，请重试' })); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-red-500" title="删除图片"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="text-xs font-medium text-white drop-shadow-md">上传于 {format(photo.createdAt, 'yyyy-MM-dd')}</div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="apple-surface flex min-h-96 flex-col items-center justify-center rounded-[2.5rem] p-12 text-center">
          <ImagePlus className="w-8 h-8 text-zinc-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">还没有摄影作品</h3>
          <p className="text-zinc-500 max-w-sm">选择一张或多张作品开始上传。</p>
        </div>
      )}
    </div>
  );
}

