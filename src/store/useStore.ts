import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { contentApi } from '../lib/api';

export type Category = 'diary' | 'learning';

export interface Post { id: string; title: string; content: string; category: Category; tags: string[]; isDraft: boolean; createdAt: number; updatedAt: number; }
export interface Photo { id: string; url: string; createdAt: number; extractedColors?: { primary: string; secondary: string } | null; takenAt?: string | null; location?: string | null; story?: string | null; }
type PhotoMetadataInput = Pick<Photo, 'takenAt' | 'location' | 'story'>;
export interface WeightRecord { id: string; weight: number; date: number; }
export interface TodoStep { id: string; title: string; completed: boolean; }
export interface TodoItem { id: string; title: string; description: string; completed: boolean; steps: TodoStep[]; createdAt: number; }
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

const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob();
const sortWeights = (weights: WeightRecord[]) => [...weights].sort((left, right) => left.date - right.date);

export const useStore = create<AppState>()(persist((set) => ({
  posts: [], photos: [], weights: [], todos: [], isInitialized: false,
  sidebarCollapsed: false, componentOpacity: 90, extractedColors: null,

  fetchData: async () => {
    try {
      const data = await contentApi.bootstrap();
      set({
        posts: data.posts as Post[], photos: data.photos as Photo[], weights: sortWeights(data.weights as WeightRecord[]), todos: data.todos as TodoItem[], isInitialized: true,
      });
    } catch (error) {
      set({ isInitialized: true });
      throw error;
    }
  },
  addPost: async (input) => {
    const post = await contentApi.createPost(input) as Post;
    set((state) => ({ posts: [post, ...state.posts] }));
    return post;
  },
  updatePost: async (id, input) => {
    const post = await contentApi.updatePost(id, input) as Post;
    set((state) => ({ posts: state.posts.map((item) => item.id === id ? post : item) }));
  },
  deletePost: async (id) => {
    await contentApi.deletePost(id);
    set((state) => ({ posts: state.posts.filter((item) => item.id !== id) }));
  },
  addPhoto: async ({ compressedImage, extractedColors }) => {
    const photo = await contentApi.uploadPhoto(await dataUrlToBlob(compressedImage), extractedColors) as Photo;
    set((state) => ({ photos: [photo, ...state.photos] }));
    return photo;
  },
  setPhotoColors: async (id, extractedColors) => {
    const photo = await contentApi.updatePhoto(id, { extractedColors }) as Photo;
    set((state) => ({ photos: state.photos.map((item) => item.id === id ? photo : item) }));
  },
  updatePhotoMetadata: async (id, metadata) => {
    const photo = await contentApi.updatePhoto(id, metadata) as Photo;
    set((state) => ({ photos: state.photos.map((item) => item.id === id ? photo : item) }));
  },
  deletePhoto: async (id) => {
    await contentApi.deletePhoto(id);
    set((state) => ({ photos: state.photos.filter((item) => item.id !== id) }));
  },
  addWeight: async (weight) => {
    const record = await contentApi.addWeight(weight) as WeightRecord;
    set((state) => ({ weights: sortWeights([...state.weights, record]) }));
  },
  deleteWeight: async (id) => {
    await contentApi.deleteWeight(id);
    set((state) => ({ weights: state.weights.filter((item) => item.id !== id) }));
  },
  addTodo: async (todo) => {
    const item = await contentApi.addTodo({ ...todo, completed: false }) as TodoItem;
    set((state) => ({ todos: [item, ...state.todos] }));
  },
  updateTodo: async (id, todo) => {
    const item = await contentApi.updateTodo(id, todo) as TodoItem;
    set((state) => ({ todos: state.todos.map((current) => current.id === id ? item : current) }));
  },
  deleteTodo: async (id) => {
    await contentApi.deleteTodo(id);
    set((state) => ({ todos: state.todos.filter((item) => item.id !== id) }));
  },
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setComponentOpacity: (componentOpacity) => set({ componentOpacity }),
  setExtractedColors: (extractedColors) => set({ extractedColors }),
}), {
  name: 'blog-ui-storage',
  partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, componentOpacity: state.componentOpacity, extractedColors: state.extractedColors }),
}));
