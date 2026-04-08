import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';
import React from 'react';

export default function Layout() {
  const componentOpacity = useStore((state) => state.componentOpacity);
  const isCollapsed = useStore((state) => state.sidebarCollapsed);

  return (
    <div 
      className="min-h-screen flex font-sans selection:bg-blue-100 selection:text-blue-900"
      style={{ 
        '--component-bg-alpha': componentOpacity / 100,
        '--sidebar-width': isCollapsed ? '5rem' : '16rem'
      } as React.CSSProperties}
    >
      <Sidebar />
      <main className="flex-1 md:pl-0 w-full min-w-0 transition-all duration-300 relative z-10 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-8 md:px-12 md:py-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
