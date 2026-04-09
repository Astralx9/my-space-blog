import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import Gallery from './pages/Gallery';
import Editor from './pages/Editor';
import Todo from './pages/Todo';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

function App() {
  const isInitialized = useStore(state => state.isInitialized);
  const fetchData = useStore(state => state.fetchData);

  useEffect(() => {
    // Fetch initial data from DB
    fetchData();
  }, [fetchData]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-500">正在从云端同步数据...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="posts" element={<Posts />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="editor" element={<Editor />} />
          <Route path="todo" element={<Todo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
