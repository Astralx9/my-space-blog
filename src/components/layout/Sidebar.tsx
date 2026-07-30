import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  PenTool,
  Menu,
  X,
  Image as ImageIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  SlidersHorizontal,
  CheckSquare,
  Newspaper,
  Scale,
} from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../hooks/useTheme';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/posts', label: '全部记录', icon: BookOpen },
  { path: '/todo', label: '待办与流程', icon: CheckSquare },
  { path: '/news', label: '新闻资讯', icon: Newspaper },
  { path: '/weight', label: '体重记录器', icon: Scale },
  { path: '/gallery', label: '摄影作品', icon: ImageIcon },
  { path: '/editor', label: '写点什么', icon: PenTool },
];

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const isCollapsed = useStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useStore((state) => state.setSidebarCollapsed);
  const componentOpacity = useStore((state) => state.componentOpacity);
  const setComponentOpacity = useStore((state) => state.setComponentOpacity);
  const extractedColors = useStore((state) => state.extractedColors);
  const { isDark, toggleTheme } = useTheme();

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="apple-glass fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-full md:hidden"
        aria-label="打开导航"
      >
        <Menu className="h-5 w-5 text-zinc-800 dark:text-zinc-200" />
      </button>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`apple-glass fixed inset-y-4 left-4 z-50 flex ${isCollapsed ? 'w-[4.5rem]' : 'w-60'} flex-col overflow-hidden rounded-[2rem] transition-[width,transform] duration-500 ease-out md:inset-y-5 md:left-5 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+2rem)] md:translate-x-0'
        }`}
      >
        <div className={`flex min-h-24 items-center p-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link
            to="/"
            className={`items-center gap-3 text-lg font-semibold tracking-[-0.035em] text-zinc-950 dark:text-white ${isCollapsed ? 'hidden' : 'flex'}`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-zinc-950 shadow-lg dark:bg-white">
              <span className="text-lg font-semibold text-white dark:text-zinc-950">A</span>
            </div>
            <span className="whitespace-nowrap">Astral Space</span>
          </Link>

          {isCollapsed && (
            <Link to="/" aria-label="返回首页">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-zinc-950 shadow-lg dark:bg-white">
                <span className="text-lg font-semibold text-white dark:text-zinc-950">A</span>
              </div>
            </Link>
          )}

          <button
            onClick={() => setIsMobileOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-black/5 md:hidden dark:hover:bg-white/10"
            aria-label="关闭导航"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-2xl transition-all duration-200 ${isCollapsed ? 'justify-center px-0' : 'px-3.5'} ${
                  isActive
                    ? 'bg-zinc-950 font-semibold text-white shadow-md dark:bg-white dark:text-zinc-950'
                    : 'text-zinc-600 hover:bg-black/[0.055] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[0.08] dark:hover:text-white'
                }`}
              >
                <Icon className="h-[1.15rem] w-[1.15rem] shrink-0" strokeWidth={1.8} />
                {!isCollapsed && <span className="whitespace-nowrap text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 border-t border-black/[0.06] p-3 dark:border-white/[0.08]">
          {!isCollapsed && (
            <div className="space-y-3 rounded-2xl bg-black/[0.04] px-3 py-3 dark:bg-white/[0.06]">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>界面透明度</span>
                </span>
                <span>{componentOpacity}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={componentOpacity}
                onChange={(event) => setComponentOpacity(Number(event.target.value))}
                aria-label="调整界面透明度"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-black/10 dark:bg-white/15"
                style={{ accentColor: extractedColors?.primary || '#0071e3' }}
              />
            </div>
          )}

          <div className={`flex items-center ${isCollapsed ? 'flex-col justify-center' : 'justify-between px-1'} gap-2`}>
            <button
              onClick={toggleTheme}
              className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[0.055] hover:text-zinc-950 dark:hover:bg-white/[0.08] dark:hover:text-white"
              title={isDark ? '切换为亮色' : '切换为暗色'}
              aria-label={isDark ? '切换为亮色' : '切换为暗色'}
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setSidebarCollapsed(!isCollapsed)}
              className="hidden h-11 w-11 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-black/[0.055] hover:text-zinc-950 md:flex dark:hover:bg-white/[0.08] dark:hover:text-white"
              title={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
              aria-label={isCollapsed ? '展开侧边栏' : '收起侧边栏'}
            >
              {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
