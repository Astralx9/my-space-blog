import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';
import React, { useEffect } from 'react';

export default function Layout() {
  const componentOpacity = useStore((state) => state.componentOpacity);
  const isCollapsed = useStore((state) => state.sidebarCollapsed);
  const extractedColors = useStore((state) => state.extractedColors);

  useEffect(() => {
    if (extractedColors) {
      // Parse "rgb(R, G, B)" to "R G B" format for Tailwind opacity support
      const parseRgb = (rgbStr: string) => {
        const match = rgbStr.match(/\d+/g);
        return match ? match.join(' ') : '';
      };
      
      const primaryRgb = parseRgb(extractedColors.primary);
      const secondaryRgb = parseRgb(extractedColors.secondary);
      
      if (primaryRgb) document.documentElement.style.setProperty('--theme-primary', primaryRgb);
      if (secondaryRgb) document.documentElement.style.setProperty('--theme-secondary', secondaryRgb);
    } else {
      document.documentElement.style.removeProperty('--theme-primary');
      document.documentElement.style.removeProperty('--theme-secondary');
    }
  }, [extractedColors]);

  return (
    <div 
      className="min-h-screen flex font-sans selection:bg-[rgb(var(--theme-primary)/0.25)] selection:text-zinc-950"
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
