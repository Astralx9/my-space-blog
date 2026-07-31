import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Posts from './pages/Posts';
import PostDetail from './pages/PostDetail';
import Gallery from './pages/Gallery';
import Editor from './pages/Editor';
import Todo from './pages/Todo';
import News from './pages/News';
import Weight from './pages/Weight';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { ArrowRight, Loader2, LogIn, UserPlus } from 'lucide-react';

const formatAuthError = (error: unknown, mode: 'signin' | 'signup') => {
  const details = error && typeof error === 'object'
    ? error as { code?: string; status?: number; message?: string }
    : undefined;
  const code = details?.code || '';
  const status = details?.status;
  const message = details?.message || '';

  if (status === 429 || /rate limit|too many requests/i.test(message)) return '尝试次数过多，请稍后再试。';
  if (/failed to fetch|network|fetch/i.test(message)) return '无法连接登录服务，请检查网络后重试。';
  if (status && status >= 500) return '登录服务暂时不可用，请稍后再试。';
  if (code === 'ALREADY_EXISTS' || /邮箱已注册|already registered|already exists/i.test(message)) return '该邮箱已注册，请切换到登录后继续。';
  if (code === 'VALIDATION_ERROR') return message || '注册信息不符合要求，请检查后重试。';
  if (code === 'INVALID_CREDENTIALS' || code === 'invalid_credentials' || /invalid login credentials/i.test(message)) return '邮箱或密码不正确，请重新输入。';
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) return '邮箱尚未验证，请先查收验证邮件并完成确认。';
  if (code === 'weak_password' || /password should be/i.test(message)) return '密码不符合要求，请使用至少 6 位密码。';
  if (code === 'signup_disabled' || /signups not allowed/i.test(message)) return '当前不开放注册，请联系网站管理员。';
  if (status === 401 || status === 403) return mode === 'signin'
    ? '登录已被拒绝，请检查邮箱和密码后重试。'
    : '注册请求被拒绝，请联系网站管理员。';

  return mode === 'signin' ? '登录失败，请稍后重试。' : '注册失败，请稍后重试。';
};

function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage('请输入邮箱地址。');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setMessage('请输入格式正确的邮箱地址。');
      return;
    }
    if (!password) {
      setMessage('请输入密码。');
      return;
    }
    if (password.length < 8) {
      setMessage('密码至少需要 8 位。');
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      await (mode === 'signin'
        ? await signIn(normalizedEmail, password)
        : await signUp(normalizedEmail, password));
    } catch (error) {
      const details = error && typeof error === 'object'
        ? error as { code?: string }
        : undefined;
      if (mode === 'signup' && details?.code === 'ALREADY_EXISTS') setMode('signin');
      setMessage(formatAuthError(error, mode));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f5f7] px-5 py-12 text-zinc-950 dark:bg-black dark:text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgb(var(--theme-primary)/0.20),transparent_32%),radial-gradient(circle_at_82%_78%,rgb(var(--theme-secondary)/0.16),transparent_30%)]" />
      <form noValidate onSubmit={handleSubmit} className="apple-surface relative z-10 w-full max-w-[30rem] rounded-[2.75rem] p-8 sm:p-12">
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg dark:bg-white dark:text-zinc-950">
            {mode === 'signin' ? <LogIn className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
          </div>
          <div>
            <p className="eyebrow mb-1">Private space</p>
            <h1 className="text-3xl font-semibold tracking-[-0.045em]">Astral Space</h1>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-4xl font-semibold tracking-[-0.05em]">{mode === 'signin' ? '欢迎回来。' : '创建你的空间。'}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">{mode === 'signin' ? '登录后继续浏览你的记录、照片和日常。' : '用一个账号保存只属于你的片段。'}</p>
        </div>

        <div className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="邮箱"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="apple-input"
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="密码（至少 8 位）"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="apple-input"
          />
        </div>

        {message && <p role="alert" aria-live="assertive" className="mt-4 text-sm leading-relaxed text-red-600">{message}</p>}

        <button type="submit" disabled={submitting} className="apple-button mt-7 w-full">
          {submitting ? '处理中...' : mode === 'signin' ? '进入空间' : '创建账号'}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setMessage('');
          }}
          className="mt-5 min-h-11 w-full rounded-full text-sm font-medium text-zinc-500 transition hover:bg-black/[0.04] hover:text-zinc-900 dark:hover:bg-white/[0.06] dark:hover:text-zinc-100"
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
          <Loader2 className="w-8 h-8 animate-spin text-[rgb(var(--theme-primary))]" />
          <p className="text-sm font-medium text-zinc-500">正在同步数据...</p>
        </div>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="posts" element={<Posts />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="editor" element={<Editor />} />
          <Route path="editor/:id" element={<Editor />} />
          <Route path="todo" element={<Todo />} />
          <Route path="news" element={<News />} />
          <Route path="weight" element={<Weight />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
