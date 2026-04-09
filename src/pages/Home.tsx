import { useStore } from '../store/useStore';
import { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';
import PostCard from '../components/PostCard';
import WeightTracker from '../components/WeightTracker';
import NewsWidget from '../components/NewsWidget';
import { format } from 'date-fns';
// @ts-ignore
import * as ColorThiefPkg from 'colorthief';
// @ts-ignore
const ColorThief = ColorThiefPkg.default || ColorThiefPkg;

export default function Home() {
  const posts = useStore((state) => state.posts);
  const photos = useStore((state) => state.photos);
  const setExtractedColors = useStore((state) => state.setExtractedColors);
  const extractedColors = useStore((state) => state.extractedColors);
  const recentPosts = posts.slice(0, 3);
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (photos.length > 0) {
      const random = photos[Math.floor(Math.random() * photos.length)];
      setBgPhoto(random.url);
      
      // If colors were pre-extracted during upload, use them immediately
      if (random.extractedColors) {
        console.log('Using pre-extracted colors:', random.extractedColors);
        setExtractedColors(random.extractedColors);
        return;
      }

      // Fallback extraction for old photos without pre-extracted colors
      const handleColorExtraction = async () => {
        try {
          // If it's a base64/data URL (local upload), we can extract directly
          if (random.url.startsWith('data:')) {
            extractColorsFromUrl(random.url);
            return;
          }

          // For external URLs, we fetch as blob to avoid Canvas CORS taint
          const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(random.url)}`);
          if (!response.ok) throw new Error('Failed to fetch image via proxy');
          
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);
          
          // Must wait for image to load to extract colors properly
          const img = new Image();
          img.onload = () => {
            try {
              const colorThief = new ColorThief();
              const palette = colorThief.getPalette(img, 5);
              if (palette && palette.length >= 2) {
                const primary = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
                const secondary = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`;
                console.log('Extracted colors successfully via proxy:', { primary, secondary });
                setExtractedColors({ primary, secondary });
              } else {
                setExtractedColors(null);
              }
            } catch (e) {
              console.warn('ColorThief extraction failed on proxy blob:', e);
              setExtractedColors(null);
            }
            URL.revokeObjectURL(objectUrl);
          };
          img.onerror = () => {
            console.warn('Failed to load proxy blob image');
            setExtractedColors(null);
            URL.revokeObjectURL(objectUrl);
          };
          img.src = objectUrl;
          
        } catch (e) {
          console.warn('Failed to fetch image for color extraction, trying direct approach:', e);
          // Fallback to trying the original URL directly
          extractColorsFromUrl(random.url);
        }
      };

      const extractColorsFromUrl = (urlToExtract: string) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
          try {
            const colorThief = new ColorThief();
            const palette = colorThief.getPalette(img, 5); // Get 5 dominant colors
            
            if (palette && palette.length >= 2) {
              const primary = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
              const secondary = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`;
              console.log('Extracted colors successfully directly:', { primary, secondary });
              setExtractedColors({ primary, secondary });
            } else {
              setExtractedColors(null);
            }
          } catch (e) {
            console.warn('ColorThief extraction failed:', e);
            setExtractedColors(null);
          }
        };
        
        img.onerror = () => {
          console.warn('Image failed to load in Image object for color extraction');
          setExtractedColors(null);
        };
        
        // Use object URL for base64 strings as well to bypass potential size limits or CSP blocks in some browsers
        if (urlToExtract.startsWith('data:')) {
          fetch(urlToExtract)
            .then(res => res.blob())
            .then(blob => {
              const objectUrl = URL.createObjectURL(blob);
              img.onload = () => {
                try {
                  const colorThief = new ColorThief();
                  const palette = colorThief.getPalette(img, 5);
                  if (palette && palette.length >= 2) {
                    const primary = `rgb(${palette[0][0]}, ${palette[0][1]}, ${palette[0][2]})`;
                    const secondary = `rgb(${palette[1][0]}, ${palette[1][1]}, ${palette[1][2]})`;
                    setExtractedColors({ primary, secondary });
                  } else {
                    setExtractedColors(null);
                  }
                } catch (e) {
                  setExtractedColors(null);
                }
                URL.revokeObjectURL(objectUrl);
              };
              img.src = objectUrl;
            })
            .catch(() => {
              img.src = urlToExtract;
            });
        } else {
          img.src = urlToExtract;
        }
      };

      handleColorExtraction();
    }
  }, [photos, setExtractedColors]);

  // Statistics
  const stats = useMemo(() => {
    let diary = 0;
    let learning = 0;
    const monthlyData: Record<string, number> = {};

    posts.forEach((post) => {
      if (post.category === 'diary') diary++;
      if (post.category === 'learning') learning++;

      const month = format(new Date(post.createdAt), 'MMM');
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    });

    const monthlyChartData = Object.keys(monthlyData).map((key) => ({
      name: key,
      count: monthlyData[key],
    })).slice(-6); // last 6 months

    return { diary, learning, monthlyChartData };
  }, [posts]);

  const pieData = [
    { name: '日记', value: stats.diary, color: extractedColors?.secondary || '#10b981' },
    { name: '学习', value: stats.learning, color: extractedColors?.primary || '#3b82f6' },
  ];

  return (
    <>
      {bgPhoto && (
        <div
          className="fixed inset-0 md:left-20 z-[-1] bg-cover bg-center bg-no-repeat transition-opacity duration-1000 after:content-[''] after:absolute after:inset-0 after:bg-black/10 dark:after:bg-black/30"
          style={{ 
            backgroundImage: `url(${bgPhoto})`,
            left: 'var(--sidebar-width, 16rem)'
          }}
        />
      )}

      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Header Profile */}
        <section className="flex flex-col gap-4 bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md p-8 rounded-3xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/50 transition-colors duration-300">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Welcome to <span 
              className="text-transparent bg-clip-text drop-shadow-sm"
              style={{ 
                backgroundImage: extractedColors 
                  ? `linear-gradient(to right, ${extractedColors.primary}, ${extractedColors.secondary})`
                  : 'linear-gradient(to right, #2563eb, #10b981)'
              }}
            >Astral's Space</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl">
            本来无一物，何处惹尘埃。
          </p>
        </section>

        {/* News and Weight Tracker Widgets */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[450px]">
            <NewsWidget />
          </div>
          <div className="h-[450px]">
            <WeightTracker />
          </div>
        </section>

        {/* Statistics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm transition-colors duration-300">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              近半年发布趋势
            </h2>
            <div className="h-64 w-full">
              {stats.monthlyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyChartData}>
                    <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-colors-white)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.monthlyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={extractedColors?.primary || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                  暂无数据
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl shadow-sm transition-colors duration-300">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              内容占比
            </h2>
            <div className="h-64 w-full relative">
              {posts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <PieCell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-400 text-sm">
                  暂无数据
                </div>
              )}
              
              {posts.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-3xl font-bold">{posts.length}</span>
                  <span className="text-xs text-zinc-500">总篇数</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Recent Posts Section */}
        <section className="space-y-6">
          <div className="bg-white/[var(--component-bg-alpha)] dark:bg-zinc-950/[var(--component-bg-alpha)] backdrop-blur-md p-6 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm transition-colors duration-300">
            <h2 className="text-2xl font-bold tracking-tight mb-6">最新动态</h2>
            {recentPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl">
                <p className="text-zinc-500 mb-4">还没有任何记录，快去发布第一篇文章吧！</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
