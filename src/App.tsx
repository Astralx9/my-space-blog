import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import Gallery from './pages/Gallery';
import Editor from './pages/Editor';
import Todo from './pages/Todo';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { isSupabaseConfigured } from './lib/supabase';
import { Loader2, LogIn, UserPlus } from 'lucide-react';

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage('Authentication is not configured. Contact the site administrator.');
      return;
    }

    setSubmitting(true);
    setMessage('');

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setMessage(result.error.message);
    } else if (mode === 'signup') {
      setMessage('注册成功。如果项目启用了邮箱确认，请先查收邮件。');
    }

    setSubmitting(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8">
          {mode === 'signin' ? <LogIn className="w-6 h-6 text-blue-500" /> : <UserPlus className="w-6 h-6 text-blue-500" />}
          <div>
            <h1 className="text-2xl font-bold">My Space</h1>
            <p className="text-sm text-zinc-500">{mode === 'signin' ? '登录后访问你的空间' : '创建一个空间账号'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="邮箱"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="密码（至少 6 位）"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {message && <p className="mt-4 text-sm text-amber-600">{message}</p>}

        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 font-medium disabled:opacity-50">
          {submitting ? '处理中...' : mode === 'signin' ? '登录' : '注册'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage('');
          }}
          className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {mode === 'signin' ? '还没有账号？注册' : '已有账号？登录'}
        </button>
      </form>
    </main>
  );
}

function App() {
  const isInitialized = useStore(state => state.isInitialized);
  const fetchData = useStore(state => state.fetchData);
  const { session, loading } = useAuth();

  useEffect(() => {
    if (session) fetchData();
  }, [fetchData, session]);

  if (loading || (session && !isInitialized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-zinc-500">正在同步数据...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="posts" element={<Posts />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="editor" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="todo" element={<Todo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
