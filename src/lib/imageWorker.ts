export const compressImageInWorker = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. First, check if OffscreenCanvas is supported in this browser.
    // If not, we MUST fall back to a main-thread Canvas compression instead of uncompressed FileReader
    // because uncompressed images will instantly exceed the 5MB localStorage limit.
    if (typeof window !== 'undefined' && typeof window.OffscreenCanvas === 'undefined') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 1920; // Improved quality
          
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            // Absolute fallback if canvas 2D is unavailable
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
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
            const MAX_WIDTH = 1920; // Improved quality
            
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
            
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0, width, height);
              const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
              
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
          // If worker fails, fallback to main-thread compression
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
      
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };
      
      worker.postMessage(file);
    } catch (e) {
      // Fallback if Worker creation fails
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
};
