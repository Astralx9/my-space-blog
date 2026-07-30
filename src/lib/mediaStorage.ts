import { supabase } from './supabase';

const BUCKET = 'blog-media';

export type MediaUploadFailure = 'session' | 'network' | 'permission' | 'bucket' | 'size' | 'unknown';

export class MediaUploadError extends Error {
  constructor(
    public readonly failure: MediaUploadFailure,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

const getStatus = (error: unknown) => {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: number; statusCode?: number };
  return candidate.status ?? candidate.statusCode;
};

const toMediaUploadError = (error: unknown) => {
  const status = getStatus(error);
  const message = error instanceof Error ? error.message : '';

  if (status === 401) return new MediaUploadError('session', '登录状态已失效，请重新登录后上传', status);
  if (status === 403) return new MediaUploadError('permission', '当前账号没有上传图片的权限，请刷新登录状态后重试', status);
  if (status === 404 || /bucket/i.test(message)) return new MediaUploadError('bucket', '图片存储空间不可用，请联系网站管理员', status);
  if (status === 413 || /too large|size limit/i.test(message)) return new MediaUploadError('size', '图片超过存储大小限制，请选择更小的图片', status);
  if (/failed to fetch|network|fetch/i.test(message)) return new MediaUploadError('network', '无法连接图片服务，请检查网络后重试', status);
  return new MediaUploadError('unknown', '图片上传服务暂时不可用，请稍后重试', status);
};

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const uploadBlogImage = async (blob: Blob, folder: 'gallery' | 'inline') => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new MediaUploadError('session', '登录状态已失效，请重新登录后上传');

  const fileName = `${userData.user.id}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    cacheControl: '31536000',
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw toMediaUploadError(error);

  return {
    userId: userData.user.id,
    path: fileName,
    url: supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl,
  };
};

export const removeBlogImage = async (path?: string | null) => {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
};
