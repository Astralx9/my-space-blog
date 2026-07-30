export interface ThemeColors {
  primary: string;
  secondary: string;
}

interface ColorBucket {
  count: number;
  red: number;
  green: number;
  blue: number;
}

const toRgb = (red: number, green: number, blue: number) =>
  `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;

export function extractImageColors(image: HTMLImageElement): ThemeColors | null {
  const canvas = document.createElement('canvas');
  const maxSide = 96;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));

  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
  const buckets = new Map<string, ColorBucket>();

  for (let index = 0; index < data.length; index += 16) {
    const [red, green, blue, alpha] = data.slice(index, index + 4);
    const brightness = (red + green + blue) / 3;
    if (alpha < 200 || brightness < 20 || brightness > 240) continue;

    const key = `${Math.floor(red / 32)}-${Math.floor(green / 32)}-${Math.floor(blue / 32)}`;
    const bucket = buckets.get(key) ?? { count: 0, red: 0, green: 0, blue: 0 };
    bucket.count += 1;
    bucket.red += red;
    bucket.green += green;
    bucket.blue += blue;
    buckets.set(key, bucket);
  }

  const colors = [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .map((bucket) => ({
      red: bucket.red / bucket.count,
      green: bucket.green / bucket.count,
      blue: bucket.blue / bucket.count,
    }));

  const primary = colors[0];
  if (!primary) return null;

  const secondary = colors.find((color) => {
    const distance = Math.hypot(color.red - primary.red, color.green - primary.green, color.blue - primary.blue);
    return distance > 80;
  }) ?? colors[1] ?? primary;

  return {
    primary: toRgb(primary.red, primary.green, primary.blue),
    secondary: toRgb(secondary.red, secondary.green, secondary.blue),
  };
}
