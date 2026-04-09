import { Link, useLocation } from 'react-router-dom';
import { Home, BookOpen, PenTool, Menu, X, Image as ImageIcon, ChevronLeft, ChevronRight, Sun, Moon, SlidersHorizontal, CheckSquare } from 'lucide-react';
import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTheme } from '../../hooks/useTheme';

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const isCollapsed = useStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useStore((state) => state.setSidebarCollapsed);
  const componentOpacity = useStore((state) => state.componentOpacity);
  const setComponentOpacity = useStore((state) => state.setComponentOpacity);
  const extractedColors = useStore((state) => state.extractedColors);
  
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/posts', label: '全部记录', icon: BookOpen },
    { path: '/todo', label: '待办与流程', icon: CheckSquare },
    { path: '/gallery', label: '摄影作品', icon: ImageIcon },
    { path: '/editor', label: '写点什么', icon: PenTool },
  ];

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-zinc-900 rounded-lg shadow-md"
      >
        <Menu className="w-5 h-5 text-zinc-800 dark:text-zinc-200" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen ${isCollapsed ? 'w-20' : 'w-64'} bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md border-r border-zinc-200/50 dark:border-zinc-800/50 flex flex-col transition-all duration-300 z-50 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link to="/" className={`text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2 ${isCollapsed ? 'hidden' : 'block'}`}>
            <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded flex items-center justify-center shrink-0">
              <span className="text-white dark:text-zinc-900 text-lg font-serif">M</span>
            </div>
            <span className="whitespace-nowrap">My Space</span>
          </Link>
          
          {isCollapsed && (
            <Link to="/">
              <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded flex items-center justify-center shrink-0">
                <span className="text-white dark:text-zinc-900 text-lg font-serif">M</span>
              </div>
            </Link>
          )}

          <button onClick={() => setIsMobileOpen(false)} className="md:hidden p-1">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 ${isCollapsed ? 'justify-center px-0' : 'px-4'} py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-900 dark:text-white font-medium'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon 
                  className={`w-5 h-5 shrink-0`} 
                  style={isActive ? { color: extractedColors?.primary || '#2563eb' } : {}}
                />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`p-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-4`}>
          {!isCollapsed && (
            <div className="px-2 space-y-2">
              <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                <SlidersHorizontal className="w-4 h-4" />
                <span>组件透明度</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={componentOpacity} 
                onChange={(e) => setComponentOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                style={{ accentColor: extractedColors?.primary || '#3b82f6' }}
              />
            </div>
          )}

          <div className="mt-auto space-y-2 pt-4">
            <div className={`flex items-center ${isCollapsed ? 'flex-col justify-center' : 'justify-between px-2'} gap-4`}>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={isDark ? "切换为亮色" : "切换为暗色"}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setSidebarCollapsed(!isCollapsed)}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hidden md:block"
                title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
              >
                {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
