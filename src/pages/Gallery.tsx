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
  queued: '绛夊緟涓?,
  compressing: '姝ｅ湪鍘嬬缉',
  uploading: '姝ｅ湪涓婁紶',
  saving: '姝ｅ湪淇濆瓨璁板綍',
  success: '瀹屾垚',
  error: '澶辫触',
};

const uploadErrorMessage = (error: unknown) => {
  if (!navigator.onLine) return '褰撳墠缃戠粶涓嶅彲鐢紝璇锋仮澶嶇綉缁滃悗閲嶈瘯';
  if (error instanceof MediaUploadError) return error.message;

  const details = error && typeof error === 'object'
    ? error as { code?: string; status?: number }
    : undefined;
  if (details?.code === '42501' || details?.status === 403) return '褰撳墠璐﹀彿娌℃湁涓婁紶鎴栦繚瀛樺浘鐗囩殑鏉冮檺锛岃閲嶆柊鐧诲綍鍚庨噸璇?;
  if (details?.status === 401) return '鐧诲綍鐘舵€佸凡澶辨晥锛岃閲嶆柊鐧诲綍鍚庝笂浼?;
  if (details?.status === 413) return '鍥剧墖瓒呰繃澶у皬闄愬埗锛岃閫夋嫨鏇村皬鐨勫浘鐗?;
  if (details?.code === 'PGRST204') return '缃戠珯鐨勬暟鎹粨鏋勫皻鏈悓姝ワ紝璇峰埛鏂伴〉闈㈠悗閲嶈瘯';

  const message = error instanceof Error ? error.message : '';
  if (message.includes('浠呮敮鎸?) || message.includes('鍘嬬缉鍚?) || message.includes('鐧诲綍') || message.includes('鍥剧墖鏂囦欢宸蹭笂浼?)) return message;
  if (/failed to fetch|network|fetch/i.test(message)) return '鏃犳硶杩炴帴鍥剧墖鏈嶅姟锛岃妫€鏌ョ綉缁滄垨鍒锋柊椤甸潰鍚庨噸璇?;
  return '涓婁紶鏈畬鎴愶紝璇峰埛鏂伴〉闈㈠悗閲嶈瘯锛涜嫢浠嶅け璐ワ紝璇疯仈绯荤鐞嗗憳骞堕檮涓婁笂浼犳椂闂?;
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
          throw new Error('浠呮敮鎸?JPG銆丳NG 鎴?WebP 鍥剧墖');
        }
        updateItem(item.id, { stage: 'compressing', progress: 15 });
        const compressedImage = await compressImageInWorker(file);
        if (compressedImage.length > 2_500_000) throw new Error('鍘嬬缉鍚庝粛瓒呰繃 2.5MB锛岃閫夋嫨鏇村皬鐨勫浘鐗?);

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
      ? { kind: 'success', message: `${succeeded} 寮犲浘鐗囧凡涓婁紶鍒颁綔鍝侀泦` }
      : { kind: 'error', message: `${succeeded}/${files.length} 寮犲浘鐗囦笂浼犳垚鍔燂紝璇锋煡鐪嬪け璐ラ」鍚庨噸璇昤 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const backfillPhotoColors = async (photo: Photo) => {
    const image = new Image();
    image.onload = async () => {
      try {
        const colors = extractImageColors(image);
        if (!colors) throw new Error('No usable colors found');
        await setPhotoColors(photo.id, colors);
        setNotice({ kind: 'success', message: '閰嶈壊宸蹭繚瀛? });
      } catch (error) {
        console.error('Failed to backfill image colors:', error);
        setNotice({ kind: 'error', message: '閰嶈壊鐢熸垚澶辫触锛岃閲嶈瘯' });
      }
    };
    image.onerror = () => setNotice({ kind: 'error', message: '鍥剧墖鍔犺浇澶辫触锛屾棤娉曠敓鎴愰厤鑹? });
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
          <h1 className="page-title hero-text-shadow">鎽勫奖浣滃搧銆?/h1>
          <p className="hero-text-shadow mt-6 max-w-2xl text-lg font-medium text-white/85 md:text-xl">
            {photos.length} 涓瀹氭牸鐨勭灛闂淬€傚畠浠細鎴愪负鏁翠釜绌洪棿鐨勮儗鏅笌鑹插僵銆?          </p>
        </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="apple-button w-fit bg-white !text-zinc-950 !shadow-xl"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
            鎵归噺涓婁紶浣滃搧
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
                <span className={item.stage === 'error' ? 'text-red-600' : item.stage === 'success' ? 'text-emerald-600' : 'text-zinc-500'}>{stageLabel[item.stage]}{item.message ? `锛?{item.message}` : ''}</span>
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
        <section className="grid grid-flow-dense grid-cols-2 gap-4 md:auto-rows-[5rem] md:grid-cols-12 md:gap-5" aria-label="鎽勫奖浣滃搧鎷煎浘澧?>
          {displayPhotos.map((photo) => (
            <div key={photo.id} className={`group relative overflow-hidden rounded-[1.75rem] bg-zinc-100 shadow-[0_18px_55px_rgb(0_0_0/0.16)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgb(0_0_0/0.24)] dark:bg-zinc-900 ${mosaicClasses[photoAspects[photo.id] || 'standard']}`}>
              <img src={photo.url} onLoad={(event) => detectAspect(photo.id, event.currentTarget)} alt="鎽勫奖浣滃搧" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.045]" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-b from-black/25 via-transparent to-black/65 p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
                <div className="flex justify-end">
                  {!photo.extractedColors && <button onClick={() => backfillPhotoColors(photo)} className="mr-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-blue-500" title="琛ラ綈鍥剧墖閰嶈壊"><Palette className="w-4 h-4" /></button>}
                  <button onClick={() => { if (window.confirm('纭畾瑕佸垹闄よ繖寮犵収鐗囧悧锛?)) void deletePhoto(photo.id).catch(() => setNotice({ kind: 'error', message: '鍒犻櫎澶辫触锛岃閲嶈瘯' })); }} className="flex h-11 w-11 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-md transition-colors hover:bg-red-500" title="鍒犻櫎鍥剧墖"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="text-xs font-medium text-white drop-shadow-md">涓婁紶浜?{format(photo.createdAt, 'yyyy-MM-dd')}</div>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="apple-surface flex min-h-96 flex-col items-center justify-center rounded-[2.5rem] p-12 text-center">
          <ImagePlus className="w-8 h-8 text-zinc-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">杩樻病鏈夋憚褰变綔鍝?/h3>
          <p className="text-zinc-500 max-w-sm">閫夋嫨涓€寮犳垨澶氬紶浣滃搧寮€濮嬩笂浼犮€?/p>
        </div>
      )}
    </div>
  );
}

