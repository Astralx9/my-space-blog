const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.72;

const compressOnMainThread = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('浏览器无法压缩图片'));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('图片格式不受支持，请选择 PNG、JPG 或 WebP 文件'));
    };
    image.src = objectUrl;
  });
};

export const compressImageInWorker = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. First, check if OffscreenCanvas is supported in this browser.
    // If not, we MUST fall back to a main-thread Canvas compression instead of uncompressed FileReader
    // because uncompressed images will instantly exceed the 5MB localStorage limit.
    if (typeof window !== 'undefined' && typeof window.OffscreenCanvas === 'undefined') {
      compressOnMainThread(file).then(resolve, reject);
      return;
    }

    // 2. If OffscreenCanvas is supported, proceed with the Web Worker approach
    const workerCode = `
      self.onmessage = async function(e) {
        try {
          const file = e.data;
          
          if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
            const bitmap = await createImageBitmap(file);
            let width = bitmap.width;
            let height = bitmap.height;
            const MAX_WIDTH = ${MAX_SIDE};
            
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0, width, height);
              const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: ${JPEG_QUALITY} });
              
              const reader = new FileReader();
              reader.onloadend = () => self.postMessage({ success: true, base64: reader.result });
              reader.onerror = () => self.postMessage({ success: false, error: 'FileReader failed' });
              reader.readAsDataURL(blob);
            } else {
              throw new Error('Failed to get 2D context in Worker');
            }
          } else {
            throw new Error('OffscreenCanvas not supported inside Worker');
          }
        } catch (err) {
          self.postMessage({ success: false, error: err.message || 'Unknown error in worker' });
        }
      };
    `;
    
    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data.base64);
        } else {
          compressOnMainThread(file).then(resolve, reject);
        }
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
      
      worker.onerror = () => {
        compressOnMainThread(file).then(resolve, reject);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
      
      worker.postMessage(file);
    } catch {
      // Fallback if Worker creation fails.
      compressOnMainThread(file).then(resolve, reject);
    }
  });
};
