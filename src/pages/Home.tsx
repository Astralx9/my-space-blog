import { useStore } from '../store/useStore';

export default function Home() {
  const photos = useStore((state) => state.photos);
  const extractedColors = useStore((state) => state.extractedColors);

  return (
    <div className="page-enter">
      <section className="flex min-h-[calc(100svh-8rem)] max-w-6xl flex-col justify-end pb-10 text-white md:min-h-[calc(100svh-6rem)] md:pb-16">
        <p className="hero-text-shadow mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
          Personal archive · {photos.length} moments
        </p>
        <h1 className="display-title hero-text-shadow max-w-6xl">
          留住此刻，
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: extractedColors
                ? `linear-gradient(100deg, #fff 5%, ${extractedColors.secondary} 88%)`
                : 'linear-gradient(100deg, #fff 5%, #c7e4ff 88%)',
            }}
          >
            也留住自己。
          </span>
        </h1>
        <p className="hero-text-shadow mt-10 max-w-xl text-lg font-medium leading-relaxed text-white/90 md:text-2xl">
          本来无一物，何处惹尘埃。
        </p>
      </section>
    </div>
  );
}
