import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { dataUrlToBlob, removeBlogImage, uploadBlogImage } from '../lib/mediaStorage';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type Category = 'diary' | 'learning';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: Category;
  tags: string[];
  isDraft: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  url: string;
  storagePath?: string | null;
  createdAt: number;
  extractedColors?: { primary: string; secondary: string } | null;
  takenAt?: string | null;
  location?: string | null;
  story?: string | null;
}

type PhotoMetadataInput = Pick<Photo, 'takenAt' | 'location' | 'story'>;

export interface WeightRecord {
  id: string;
  weight: number;
  date: number;
}

export interface TodoStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  steps: TodoStep[];
  createdAt: number;
}

type PostInput = Pick<Post, 'title' | 'content' | 'category' | 'tags' | 'isDraft'>;

interface AppState {
  posts: Post[];
  photos: Photo[];
  weights: WeightRecord[];
  todos: TodoItem[];
  sidebarCollapsed: boolean;
  componentOpacity: number;
  extractedColors: { primary: string; secondary: string } | null;
  isInitialized: boolean;
  fetchData: () => Promise<void>;
  addPost: (post: PostInput) => Promise<Post>;
  updatePost: (id: string, post: PostInput) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addPhoto: (photoData: { compressedImage: string; extractedColors?: { primary: string; secondary: string } | null }) => Promise<Photo>;
  setPhotoColors: (id: string, colors: { primary: string; secondary: string }) => Promise<void>;
  updatePhotoMetadata: (id: string, metadata: PhotoMetadataInput) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  addWeight: (weight: number) => Promise<void>;
  deleteWeight: (id: string) => Promise<void>;
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => Promise<void>;
  updateTodo: (id: string, todo: Partial<TodoItem>) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setComponentOpacity: (opacity: number) => void;
  setExtractedColors: (colors: { primary: string; secondary: string } | null) => void;
}

const normalizePost = (post: Partial<Post>): Post => ({
  id: post.id!,
  title: post.title || '',
  content: post.content || '',
  category: post.category || 'diary',
  tags: post.tags || [],
  isDraft: post.isDraft || false,
  createdAt: post.createdAt || Date.now(),
  updatedAt: post.updatedAt || post.createdAt || Date.now(),
});

const normalizePhoto = (photo: Photo & { storage_path?: string | null }): Photo => ({
  ...photo,
  storagePath: photo.storage_path ?? photo.storagePath ?? null,
  takenAt: (photo as Photo & { taken_at?: string | null }).taken_at ?? photo.takenAt ?? null,
});

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      posts: [],
      photos: [],
      weights: [],
      todos: [],
      isInitialized: false,
      sidebarCollapsed: false,
      componentOpacity: 90,
      extractedColors: null,

      fetchData: async () => {
        if (!isSupabaseConfigured) {
          set({ isInitialized: true });
          return;
        }

        try {
          const [postsRes, photosRes, weightsRes, todosRes] = await Promise.all([
            supabase.from('posts').select('*').order('createdAt', { ascending: false }),
            supabase.from('photos').select('*').order('createdAt', { ascending: false }),
            supabase.from('weights').select('*').order('date', { ascending: true }),
            supabase.from('todos').select('*').order('createdAt', { ascending: false }),
          ]);
          const error = postsRes.error || photosRes.error || weightsRes.error || todosRes.error;
          if (error) throw error;

          set({
            posts: (postsRes.data || []).map(normalizePost),
            photos: (photosRes.data || []).map(normalizePhoto),
            weights: weightsRes.data || [],
            todos: todosRes.data || [],
            isInitialized: true,
          });
        } catch (error) {
          console.error('Error fetching data from Supabase', error);
          set({ isInitialized: true });
        }
      },

      addPost: async (postData) => {
        const now = Date.now();
        const newPost: Post = { ...postData, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
        const { error } = await supabase.from('posts').insert(newPost);
        if (error) throw error;
        set((state) => ({ posts: [newPost, ...state.posts] }));
        return newPost;
      },

      updatePost: async (id, postData) => {
        const updatedAt = Date.now();
        const { error } = await supabase.from('posts').update({ ...postData, updatedAt }).eq('id', id);
        if (error) throw error;
        set((state) => ({
          posts: state.posts.map((post) => post.id === id ? { ...post, ...postData, updatedAt } : post),
        }));
      },

      deletePost: async (id) => {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ posts: state.posts.filter((post) => post.id !== id) }));
      },

      addPhoto: async ({ compressedImage, extractedColors }) => {
        const uploaded = await uploadBlogImage(await dataUrlToBlob(compressedImage), 'gallery');
        const newPhoto: Photo = {
          id: crypto.randomUUID(),
          url: uploaded.url,
          storagePath: uploaded.path,
          extractedColors: extractedColors || null,
          createdAt: Date.now(),
        };
        // `storagePath` is a client-side property. The persisted column uses
        // snake case, so it must not be spread into the PostgREST payload.
        const { error } = await supabase.from('photos').insert({
          id: newPhoto.id,
          url: newPhoto.url,
          storage_path: uploaded.path,
          extractedColors: newPhoto.extractedColors,
          createdAt: newPhoto.createdAt,
          user_id: uploaded.userId,
        });
        if (error) {
          await removeBlogImage(uploaded.path).catch(() => undefined);
          if (error.code === '42501') throw new Error('没有保存图片记录的权限，请重新登录后重试');
          if (error.code === 'PGRST204') throw new Error('网站的数据结构尚未同步，请刷新页面后重试');
          throw new Error('图片文件已上传但保存记录失败，系统已自动清理文件，请稍后重试');
        }
        set((state) => ({ photos: [newPhoto, ...state.photos] }));
        return newPhoto;
      },

      setPhotoColors: async (id, colors) => {
        const { error } = await supabase.from('photos').update({ extractedColors: colors }).eq('id', id);
        if (error) throw error;
        set((state) => ({
          photos: state.photos.map((photo) => photo.id === id ? { ...photo, extractedColors: colors } : photo),
        }));
      },

      updatePhotoMetadata: async (id, metadata) => {
        const takenAt = metadata.takenAt || null;
        const location = metadata.location?.trim() || null;
        const story = metadata.story?.trim() || null;
        const { error } = await supabase.from('photos').update({
          taken_at: takenAt,
          location,
          story,
        }).eq('id', id);
        if (error) throw error;
        set((state) => ({
          photos: state.photos.map((photo) => photo.id === id ? { ...photo, takenAt, location, story } : photo),
        }));
      },

      deletePhoto: async (id) => {
        const photo = get().photos.find((item) => item.id === id);
        const { error } = await supabase.from('photos').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ photos: state.photos.filter((photoItem) => photoItem.id !== id) }));
        await removeBlogImage(photo?.storagePath).catch((storageError) => {
          console.error('Photo record was deleted, but Storage cleanup failed:', storageError);
        });
      },

      addWeight: async (weight) => {
        const newWeight: WeightRecord = { id: crypto.randomUUID(), weight, date: Date.now() };
        const { error } = await supabase.from('weights').insert(newWeight);
        if (error) throw error;
        set((state) => ({ weights: [...state.weights, newWeight].sort((a, b) => a.date - b.date) }));
      },

      deleteWeight: async (id) => {
        const { error } = await supabase.from('weights').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ weights: state.weights.filter((weight) => weight.id !== id) }));
      },

      addTodo: async (todo) => {
        const newTodo: TodoItem = { ...todo, id: crypto.randomUUID(), completed: false, createdAt: Date.now() };
        const { error } = await supabase.from('todos').insert(newTodo);
        if (error) throw error;
        set((state) => ({ todos: [newTodo, ...state.todos] }));
      },

      updateTodo: async (id, updatedTodo) => {
        const { error } = await supabase.from('todos').update(updatedTodo).eq('id', id);
        if (error) throw error;
        set((state) => ({ todos: state.todos.map((todo) => todo.id === id ? { ...todo, ...updatedTodo } : todo) }));
      },

      deleteTodo: async (id) => {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (error) throw error;
        set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) }));
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setComponentOpacity: (opacity) => set({ componentOpacity: opacity }),
      setExtractedColors: (colors) => set({ extractedColors: colors }),
    }),
    {
      name: 'blog-ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        componentOpacity: state.componentOpacity,
        extractedColors: state.extractedColors,
      }),
    },
  ),
);

