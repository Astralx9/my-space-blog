import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export type Category = 'diary' | 'learning';

export interface Post {
  id: string;
  title: string;
  content: string;
  category: Category;
  createdAt: number;
}

export interface Photo {
  id: string;
  url: string;
  createdAt: number;
  extractedColors?: { primary: string; secondary: string } | null;
}

export interface WeightRecord {
  id: string;
  weight: number;
  date: number; // timestamp
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

interface AppState {
  posts: Post[];
  photos: Photo[];
  weights: WeightRecord[];
  todos: TodoItem[];
  sidebarCollapsed: boolean;
  componentOpacity: number;
  extractedColors: { primary: string; secondary: string } | null;
  isUnlocked: boolean;
  isInitialized: boolean;
  
  fetchData: () => Promise<void>;
  checkPassword: () => boolean;
  
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addPhoto: (photoData: { url: string, extractedColors?: { primary: string; secondary: string } | null }) => Promise<void>;
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
      isUnlocked: false,

      checkPassword: () => {
        if (get().isUnlocked) return true;
        const pwd = window.prompt('请输入博主密码以执行此操作：');
        if (pwd === 'hph') {
          set({ isUnlocked: true });
          return true;
        }
        if (pwd !== null) {
          alert('密码错误');
        }
        return false;
      },

      fetchData: async () => {
        try {
          const [postsRes, photosRes, weightsRes, todosRes] = await Promise.all([
            supabase.from('posts').select('*').order('createdAt', { ascending: false }),
            supabase.from('photos').select('*').order('createdAt', { ascending: false }),
            supabase.from('weights').select('*').order('date', { ascending: true }),
            supabase.from('todos').select('*').order('createdAt', { ascending: false })
          ]);

          set({
            posts: postsRes.data || [],
            photos: photosRes.data || [],
            weights: weightsRes.data || [],
            todos: todosRes.data || [],
            isInitialized: true
          });
        } catch (error) {
          console.error("Error fetching data from Supabase", error);
        }
      },

      addPost: async (postData) => {
        const newPost: Post = {
          ...postData,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        const { error } = await supabase.from('posts').insert(newPost);
        if (!error) {
          set((state) => ({ posts: [newPost, ...state.posts] }));
        } else throw error;
      },

      deletePost: async (id) => {
        const { error } = await supabase.from('posts').delete().eq('id', id);
        if (!error) {
          set((state) => ({ posts: state.posts.filter((post) => post.id !== id) }));
        } else throw error;
      },

      addPhoto: async (photoData) => {
        const newPhoto: Photo = {
          id: crypto.randomUUID(),
          url: photoData.url,
          extractedColors: photoData.extractedColors || null,
          createdAt: Date.now(),
        };
        const { error } = await supabase.from('photos').insert(newPhoto);
        if (!error) {
          set((state) => ({ photos: [newPhoto, ...state.photos] }));
        } else throw error;
      },

      deletePhoto: async (id) => {
        const { error } = await supabase.from('photos').delete().eq('id', id);
        if (!error) {
          set((state) => ({ photos: state.photos.filter((photo) => photo.id !== id) }));
        } else throw error;
      },

      addWeight: async (weight) => {
        const newWeight: WeightRecord = {
          id: crypto.randomUUID(),
          weight,
          date: Date.now(),
        };
        const { error } = await supabase.from('weights').insert(newWeight);
        if (!error) {
          set((state) => ({ 
            weights: [...state.weights, newWeight].sort((a, b) => a.date - b.date) 
          }));
        } else throw error;
      },

      deleteWeight: async (id) => {
        const { error } = await supabase.from('weights').delete().eq('id', id);
        if (!error) {
          set((state) => ({ weights: state.weights.filter((w) => w.id !== id) }));
        } else throw error;
      },

      addTodo: async (todo) => {
        const newTodo: TodoItem = {
          ...todo,
          id: crypto.randomUUID(),
          completed: false,
          createdAt: Date.now(),
        };
        const { error } = await supabase.from('todos').insert(newTodo);
        if (!error) {
          set((state) => ({ todos: [newTodo, ...state.todos] }));
        } else throw error;
      },

      updateTodo: async (id, updatedTodo) => {
        const { error } = await supabase.from('todos').update(updatedTodo).eq('id', id);
        if (!error) {
          set((state) => ({
            todos: state.todos.map((todo) => 
              todo.id === id ? { ...todo, ...updatedTodo } : todo
            ),
          }));
        } else throw error;
      },

      deleteTodo: async (id) => {
        const { error } = await supabase.from('todos').delete().eq('id', id);
        if (!error) {
          set((state) => ({ todos: state.todos.filter((todo) => todo.id !== id) }));
        } else throw error;
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setComponentOpacity: (opacity) => set({ componentOpacity: opacity }),
      setExtractedColors: (colors) => set({ extractedColors: colors }),
    }),
    {
      name: 'blog-ui-storage',
      // ONLY persist UI state. Data comes from Supabase!
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        componentOpacity: state.componentOpacity,
        extractedColors: state.extractedColors,
      }),
    }
  )
);