type Region = 'all' | 'cn' | 'intl';
type Topic = 'all' | 'tech' | 'finance' | 'ai';

type Feed = {
  name: string;
  url: string;
  region: Exclude<Region, 'all'>;
  topics: Exclude<Topic, 'all'>[];
};

type NewsItem = { title: string; link: string; pubDate: string; source: string };
type RequestLike = { query?: Record<string, string | string[] | undefined> };
type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => { json: (body: unknown) => void };
};

// Domestic feeds are official publisher RSS feeds. The browser never uses RSSHub or rss2json.
const feeds: Feed[] = [
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', region: 'cn', topics: ['tech'] },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'cn', topics: ['tech'] },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'cn', topics: ['tech', 'finance', 'ai'] },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', region: 'intl', topics: ['tech', 'ai'] },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'intl', topics: ['tech'] },
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', region: 'intl', topics: ['ai'] },
];

const normalizeFilter = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (
  typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback
);

const decodeText = (value: string | undefined) => (value || '')
  .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

const tagValue = (xml: string, tag: string) => {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return decodeText(match?.[1]);
};

const atomLink = (xml: string) => decodeText(xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]);

const parseFeed = (xml: string, source: string): NewsItem[] => {
  const blocks = Array.from(xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi));

  return blocks.flatMap((match) => {
    const block = match[1];
    const title = tagValue(block, 'title');
    const link = tagValue(block, 'link') || atomLink(block);
    const pubDate = tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated');
    if (!title || !link || !pubDate || Number.isNaN(Date.parse(pubDate))) return [];
    return [{ title, link, pubDate: new Date(pubDate).toISOString(), source }];
  });
};

const fetchFeed = async (feed: Feed): Promise<NewsItem[]> => {
  const feedResponse = await fetch(feed.url, {
    headers: {
      'User-Agent': 'Astral-Space-News/1.0 (+https://my-space-blog-xi.vercel.app)',
      Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!feedResponse.ok) throw new Error(`${feed.name} returned ${feedResponse.status}`);
  return parseFeed(await feedResponse.text(), feed.name).slice(0, 12);
};

export default async function handler(request: RequestLike, response: ResponseLike) {
  const region = normalizeFilter(request.query?.region, ['all', 'cn', 'intl'] as const, 'cn');
  const topic = normalizeFilter(request.query?.topic, ['all', 'tech', 'finance', 'ai'] as const, 'all');
  const selectedFeeds = feeds.filter((feed) => (
    (region === 'all' || feed.region === region)
    && (topic === 'all' || feed.topics.includes(topic))
  ));

  response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const settled = await Promise.allSettled(selectedFeeds.map(fetchFeed));
  const successful = settled.flatMap((result, index) => (
    result.status === 'fulfilled' && result.value.length > 0
      ? [{ feed: selectedFeeds[index], items: result.value }]
      : []
  ));
  const items = successful
    .flatMap(({ items: feedItems }) => feedItems)
    .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
    .slice(0, 36);

  return response.status(200).json({
    items,
    sources: successful.map(({ feed, items: feedItems }) => ({ name: feed.name, count: feedItems.length })),
    failedSources: settled.flatMap((result, index) => (
      result.status === 'rejected' || result.value.length === 0 ? [selectedFeeds[index].name] : []
    )),
    updatedAt: new Date().toISOString(),
  });
}
