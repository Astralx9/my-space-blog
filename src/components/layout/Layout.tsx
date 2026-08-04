import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '../../store/useStore';
import React, { useEffect, useRef, useState } from 'react';
import { advanceBackgroundSequence, getBackgroundCandidateIds } from '../../lib/backgroundSequence';

export default function Layout() {
  const componentOpacity = useStore((state) => state.componentOpacity);
  const isCollapsed = useStore((state) => state.sidebarCollapsed);
  const extractedColors = useStore((state) => state.extractedColors);
  const photos = useStore((state) => state.photos);
  const setExtractedColors = useStore((state) => state.setExtractedColors);
  const backfillPhotoDimensions = useStore((state) => state.backfillPhotoDimensions);
  const backgroundPhotoId = useRef<string | null>(null);
  const dimensionsRequested = useRef(new Set<string>());
  const [backgroundPhoto, setBackgroundPhoto] = useState<(typeof photos)[number] | null>(null);
  const [isBackgroundLoaded, setIsBackgroundLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const retainedPhoto = backgroundPhotoId.current
      ? photos.find((photo) => photo.id === backgroundPhotoId.current)
      : undefined;
    if (retainedPhoto) {
      setBackgroundPhoto(retainedPhoto);
      return () => { cancelled = true; };
    }

    const findLandscapePhoto = async () => {
      const photoIds = photos.map((photo) => photo.id);
      const photosById = new Map(photos.map((photo) => [photo.id, photo]));
      for (const photoId of getBackgroundCandidateIds(photoIds)) {
        const photo = photosById.get(photoId);
        if (!photo || (photo.width && photo.height && photo.width <= photo.height)) continue;
        const image = new Image();
        image.decoding = 'async';
        image.fetchPriority = 'high';
        const loaded = await new Promise<boolean>((resolve) => {
          image.onload = () => resolve(true);
          image.onerror = () => resolve(false);
          image.src = photo.url;
        });

        if (cancelled) return;
        if (!loaded) continue;
        const hasStoredDimensions = Boolean(photo.width && photo.height);
        if (!hasStoredDimensions && !dimensionsRequested.current.has(photo.id)) {
          dimensionsRequested.current.add(photo.id);
          void backfillPhotoDimensions(photo.id).catch(() => dimensionsRequested.current.delete(photo.id));
        }
        if (image.naturalWidth > image.naturalHeight) {
          backgroundPhotoId.current = photo.id;
          setIsBackgroundLoaded(false);
          setBackgroundPhoto(photo);
          advanceBackgroundSequence(photoIds, photo.id);
          return;
        }
      }

      if (!cancelled) {
        backgroundPhotoId.current = null;
        setIsBackgroundLoaded(false);
        setBackgroundPhoto(null);
      }
    };

    void findLandscapePhoto();

    return () => { cancelled = true; };
  }, [backfillPhotoDimensions, photos]);

  useEffect(() => {
    setExtractedColors(backgroundPhoto?.extractedColors ?? null);
  }, [backgroundPhoto, setExtractedColors]);

  useEffect(() => {
    const parseRgb = (rgbString: string) => rgbString.match(/\d+/g)?.slice(0, 3).join(' ');
    const primaryRgb = extractedColors && parseRgb(extractedColors.primary);
    const secondaryRgb = extractedColors && parseRgb(extractedColors.secondary);

    document.documentElement.style.setProperty('--theme-primary', primaryRgb || '0 113 227');
    document.documentElement.style.setProperty('--theme-secondary', secondaryRgb || '52 199 89');
  }, [extractedColors]);

  const normalizedOpacity = componentOpacity / 100;

  return (
    <div
      className="relative isolate min-h-screen overflow-x-clip font-sans"
      style={{
        '--component-bg-alpha': normalizedOpacity,
        '--surface-alpha': 0.58 + normalizedOpacity * 0.4,
        '--glass-alpha': 0.52 + normalizedOpacity * 0.42,
        '--sidebar-width': isCollapsed ? '6.5rem' : '17.5rem',
      } as React.CSSProperties}
    >
      <div className="pointer-events-none fixed inset-0 z-[-3] bg-[radial-gradient(circle_at_76%_12%,rgb(var(--theme-primary)/0.46),transparent_34%),radial-gradient(circle_at_18%_28%,rgb(var(--theme-secondary)/0.24),transparent_28%),linear-gradient(145deg,#111827_0%,#172554_52%,#09090b_100%)]" />
      {backgroundPhoto && (
        <img
          src={backgroundPhoto.url}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setIsBackgroundLoaded(true)}
          onError={() => setIsBackgroundLoaded(false)}
          className={`pointer-events-none fixed inset-0 z-[-2] h-full w-full scale-[1.02] object-cover transition-opacity duration-700 ease-out ${isBackgroundLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      <div className="pointer-events-none fixed inset-0 z-[-1] bg-[linear-gradient(90deg,rgba(0,0,0,0.22)_0%,transparent_72%),linear-gradient(180deg,rgba(0,0,0,0.20)_0%,rgba(0,0,0,0.04)_34%,rgba(245,245,247,0.78)_70%,rgba(245,245,247,0.96)_100%)] dark:bg-[linear-gradient(90deg,rgba(0,0,0,0.30)_0%,transparent_72%),linear-gradient(180deg,rgba(0,0,0,0.36)_0%,rgba(0,0,0,0.14)_34%,rgba(0,0,0,0.78)_72%,rgba(0,0,0,0.96)_100%)]" />

      <Sidebar />
      <main className="relative z-10 min-h-screen min-w-0 transition-[padding] duration-500 ease-out md:pl-[var(--sidebar-width)]">
        <div className="page-shell">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

