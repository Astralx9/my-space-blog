import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { ImagePlus, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { compressImageInWorker } from '../lib/imageWorker';
// @ts-ignore
import * as ColorThiefPkg from 'colorthief';
// @ts-ignore
const ColorThief = ColorThiefPkg.default || ColorThiefPkg;

export default function Gallery() {
  const photos = useStore((state) => state.photos);
  const addPhoto = useStore((state) => state.addPhoto);
  const deletePhoto = useStore((state) => state.deletePhoto);
  const checkPassword = useStore((state) => state.checkPassword);
  const [uploadStatus, setUploadStatus] = useState<{ status: 'idle' | 'uploading' | 'success' | 'error', message?: string }>({ status: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!checkPassword()) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus({ status: 'uploading', message: `正在处理 ${files.length} 张图片...` });

    try {
      const processPromises = Array.from(files).map(async (file) => {
        // Compress in background
        const base64 = await compressImageInWorker(file);
        
        // Extract colors
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const colorThief = new ColorThief();
              const palette = colorThief.getPalette(img, 5);
              if (palette && palette.length >= 2) {
                const primary = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
                const secondary = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`;
                addPhoto({ url: base64, extractedColors: { primary, secondary } });
              } else {
                addPhoto({ url: base64 });
              }
            } catch (err) {
              console.warn('Failed to extract color on upload', err);
              addPhoto({ url: base64 });
            }
            resolve();
          };
          img.onerror = () => {
            addPhoto({ url: base64 });
            resolve();
          };
          // Use the raw file blob to bypass data URI issues in ColorThief during upload
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
          
          // Cleanup
          img.onloadend = () => {
            URL.revokeObjectURL(objectUrl);
          };
        });
      });

      await Promise.all(processPromises);
      
      setUploadStatus({ status: 'success', message: '图片上传成功' });
      setTimeout(() => setUploadStatus({ status: 'idle' }), 3000);
    } catch (error) {
      console.error('Image processing failed:', error);
      setUploadStatus({ status: 'error', message: '图片处理失败，请重试' });
      setTimeout(() => setUploadStatus({ status: 'idle' }), 3000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">摄影作品</h1>
          <p className="text-zinc-500 dark:text-zinc-400">总计 {photos.length} 张照片。这些照片将会随机显示在主页背景上。</p>
        </div>

        <div className="flex items-center gap-3">
          {uploadStatus.status !== 'idle' && (
            <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-300 ${
              uploadStatus.status === 'uploading' ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400' :
              uploadStatus.status === 'success' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' :
              'text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400'
            }`}>
              {uploadStatus.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin" />}
              {uploadStatus.status === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {uploadStatus.status === 'error' && <AlertCircle className="w-4 h-4" />}
              {uploadStatus.message}
            </div>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadStatus.status === 'uploading'}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImagePlus className="w-5 h-5" />
            上传作品
          </button>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          multiple
          className="hidden"
        />
      </div>

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div 
              key={photo.id} 
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-100/[var(--component-bg-alpha)] dark:bg-zinc-900/[var(--component-bg-alpha)] backdrop-blur-sm shadow-sm border border-zinc-200 dark:border-zinc-800"
            >
              <img 
                src={photo.url} 
                alt="Photography work" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      if (!checkPassword()) return;
                      if(window.confirm('确定要删除这张照片吗？')) {
                        deletePhoto(photo.id);
                      }
                    }}
                    className="p-2 bg-white/20 hover:bg-red-500 text-white rounded-full backdrop-blur-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-white text-xs font-medium drop-shadow-md">
                  上传于 {format(photo.createdAt, 'yyyy-MM-dd')}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-24 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <ImagePlus className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-lg font-bold mb-2">还没有摄影作品</h3>
          <p className="text-zinc-500 mb-6 max-w-sm">
            点击上方按钮上传您的摄影作品，它们将会作为背景随机展示在主页。
          </p>
        </div>
      )}
    </div>
  );
}
