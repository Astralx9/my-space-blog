const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

const getTargetSize = (width: number, height: number) => {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const compressOnMainThread = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const objectUrl = URL.createObjectURL(file);
  const image = new Image();

  const cleanup = () => URL.revokeObjectURL(objectUrl);
  image.onload = () => {
    const { width, height } = getTargetSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      cleanup();
      reject(new Error('浏览器无法创建图片画布'));
      return;
    }

    context.drawImage(image, 0, 0, width, height);
    const result = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    cleanup();
    resolve(result);
  };
  image.onerror = () => {
    cleanup();
    reject(new Error(`无法读取图片：${file.name}`));
  };
  image.src = objectUrl;
});

export const compressImageInWorker = (file: File): Promise<string> => {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    return compressOnMainThread(file);
  }

  return new Promise((resolve, reject) => {
    const workerCode = `
      self.onmessage = async ({ data: file }) => {
        try {
          const bitmap = await createImageBitmap(file);
          const scale = Math.min(1, ${MAX_DIMENSION} / Math.max(bitmap.width, bitmap.height));
          const width = Math.max(1, Math.round(bitmap.width * scale));
          const height = Math.max(1, Math.round(bitmap.height * scale));
          const canvas = new OffscreenCanvas(width, height);
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas context unavailable');
          context.drawImage(bitmap, 0, 0, width, height);
          bitmap.close();
          const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: ${JPEG_QUALITY} });
          const reader = new FileReader();
          reader.onloadend = () => self.postMessage({ result: reader.result });
          reader.onerror = () => self.postMessage({ error: 'FileReader failed' });
          reader.readAsDataURL(blob);
        } catch (error) {
          self.postMessage({ error: error instanceof Error ? error.message : 'Image compression failed' });
        }
      };
    `;
    const workerUrl = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
    const worker = new Worker(workerUrl);
    let finished = false;

    const cleanup = () => {
      if (finished) return false;
      finished = true;
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      return true;
    };
    const fallback = () => {
      if (!cleanup()) return;
      compressOnMainThread(file).then(resolve, reject);
    };

    worker.onmessage = ({ data }) => {
      if (data.result) {
        if (cleanup()) resolve(data.result);
      } else {
        fallback();
      }
    };
    worker.onerror = fallback;

    try {
      worker.postMessage(file);
    } catch {
      fallback();
    }
  });
};
