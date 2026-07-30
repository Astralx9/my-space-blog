import { supabase } from './supabase';

const BUCKET = 'blog-media';

export const dataUrlToBlob = async (dataUrl: string) => {
  const response = await fetch(dataUrl);
  return response.blob();
};

export const uploadBlogImage = async (blob: Blob, folder: 'gallery' | 'inline') => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('登录已失效，请重新登录后再上传');

  const fileName = `${userData.user.id}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(fileName, blob, {
    cacheControl: '31536000',
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  return {
    path: fileName,
    url: supabase.storage.from(BUCKET).getPublicUrl(fileName).data.publicUrl,
  };
};

export const removeBlogImage = async (path?: string | null) => {
  if (!path) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
};
