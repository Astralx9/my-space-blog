import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addPost: (post: Omit<Post, 'id' | 'createdAt'>) => void;
  deletePost: (id: string) => void;
  addPhoto: (photoData: { url: string, extractedColors?: { primary: string; secondary: string } | null }) => void;
  deletePhoto: (id: string) => void;
  addWeight: (weight: number) => void;
  deleteWeight: (id: string) => void;
  addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'completed'>) => void;
  updateTodo: (id: string, todo: Partial<TodoItem>) => void;
  deleteTodo: (id: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setComponentOpacity: (opacity: number) => void;
  setExtractedColors: (colors: { primary: string; secondary: string } | null) => void;
}

const INITIAL_PHOTOS: Photo[] = [
  { 
    id: 'photo_1', 
    url: 'https://images.unsplash.com/photo-1506744626753-1fa44df31c78?auto=format&fit=crop&w=1600&q=80', 
    extractedColors: { primary: 'rgb(44, 53, 57)', secondary: 'rgb(201, 169, 142)' },
    createdAt: Date.now() - 100000 
  },
  { 
    id: 'photo_2', 
    url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80', 
    extractedColors: { primary: 'rgb(91, 123, 102)', secondary: 'rgb(180, 185, 172)' },
    createdAt: Date.now() - 200000 
  },
  { 
    id: 'photo_3', 
    url: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=1600&q=80', 
    extractedColors: { primary: 'rgb(51, 62, 45)', secondary: 'rgb(136, 155, 126)' },
    createdAt: Date.now() - 300000 
  },
];

const INITIAL_POSTS: Post[] = [
  {
    id: 'post_1',
    title: '周末的现代摄影展与漫步',
    content: '今天去看了市中心的现代摄影展，展出的作品非常有启发性。尤其是光影的运用，给了我很多灵感。\n\n看完展览后在附近的咖啡馆坐了一下午，整理了一下最近的思绪。生活需要这样的留白，才能更好地重新出发。\n\n![咖啡馆](https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80)',
    category: 'diary',
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
  },
  {
    id: 'post_2',
    title: 'React 状态管理与 Zustand 实践',
    content: '最近在重构个人项目，决定把原本的复杂状态管理替换成 Zustand。\n\n### 为什么选择 Zustand？\n1. **极简的 API**：不需要写繁琐的 reducer 和 action types。\n2. **包体积小**：非常轻量，压缩后不足 1kb。\n3. **无缝支持 React Hooks**：心智模型和普通的 Hooks 一模一样。\n\n```typescript\nimport { create } from "zustand";\n\nconst useStore = create((set) => ({\n  count: 0,\n  inc: () => set((state) => ({ count: state.count + 1 })),\n}));\n```\n\n目前体验下来非常顺畅，特别适合中小型项目，甚至大型项目也能通过模块化拆分轻松应对！',
    category: 'learning',
    createdAt: Date.now() - 86400000 * 5, // 5 days ago
  },
  {
    id: 'post_3',
    title: '写给自己的新的一年规划',
    content: '新的一年，给自己定下几个小目标：\n\n- [x] 搭建属于自己的全功能个人博客\n- [ ] 每周至少阅读一本书\n- [ ] 坚持记录博客，每月至少 4 篇文章\n- [ ] 学习一门新的编程语言（Rust 或者 Go）\n- [ ] 来一次说走就走的旅行\n\n希望年底回顾的时候，能骄傲地给这些选项都打上勾！这不仅是一份计划，更是对未来生活的热爱与期许。',
    category: 'diary',
    createdAt: Date.now() - 86400000 * 10, // 10 days ago
  }
];

const INITIAL_WEIGHTS: WeightRecord[] = [];

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 'todo_1',
    title: '完成博客的新功能开发',
    description: '实现爬虫新闻、体重记录器和TODO列表功能，并确保响应式适配',
    completed: false,
    steps: [
      { id: 's1', title: '更新 Zustand 状态管理', completed: true },
      { id: 's2', title: '开发 Weight Tracker 组件', completed: false },
      { id: 's3', title: '开发 News Widget 组件', completed: false },
      { id: 's4', title: '开发 TODO 列表页面', completed: false }
    ],
    createdAt: Date.now() - 3600000
  }
];

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      posts: INITIAL_POSTS,
      photos: INITIAL_PHOTOS,
      weights: INITIAL_WEIGHTS,
      todos: INITIAL_TODOS,
      sidebarCollapsed: false,
      componentOpacity: 90,
      extractedColors: null,
      addPost: (postData) =>
        set((state) => {
          const newPost: Post = {
            ...postData,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
          };
          return { posts: [newPost, ...state.posts] };
        }),
      deletePost: (id) =>
        set((state) => ({
          posts: state.posts.filter((post) => post.id !== id),
        })),
      addPhoto: (photoData) =>
        set((state) => {
          const newPhoto: Photo = {
            id: crypto.randomUUID(),
            url: photoData.url,
            extractedColors: photoData.extractedColors || null,
            createdAt: Date.now(),
          };
          return { photos: [newPhoto, ...state.photos] };
        }),
      deletePhoto: (id) =>
        set((state) => ({
          photos: state.photos.filter((photo) => photo.id !== id),
        })),
      addWeight: (weight) =>
        set((state) => {
          const newWeight: WeightRecord = {
            id: crypto.randomUUID(),
            weight,
            date: Date.now(),
          };
          return { weights: [...state.weights, newWeight].sort((a, b) => a.date - b.date) };
        }),
      deleteWeight: (id) =>
        set((state) => ({
          weights: state.weights.filter((w) => w.id !== id),
        })),
      addTodo: (todo) =>
        set((state) => {
          const newTodo: TodoItem = {
            ...todo,
            id: crypto.randomUUID(),
            completed: false,
            createdAt: Date.now(),
          };
          return { todos: [newTodo, ...state.todos] };
        }),
      updateTodo: (id, updatedTodo) =>
        set((state) => ({
          todos: state.todos.map((todo) => 
            todo.id === id ? { ...todo, ...updatedTodo } : todo
          ),
        })),
      deleteTodo: (id) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setComponentOpacity: (opacity) => set({ componentOpacity: opacity }),
      setExtractedColors: (colors) => set({ extractedColors: colors }),
    }),
    {
      name: 'blog-storage-v6', // Bump version to backfill dummy colors
    }
  )
);
