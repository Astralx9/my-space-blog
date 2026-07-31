type Region = 'all' | 'cn' | 'intl';
type Topic = 'all' | 'tech' | 'finance' | 'ai';

type Feed = { name: string; url: string; region: Exclude<Region, 'all'>; topics: Exclude<Topic, 'all'>[] };
export type NewsItem = { title: string; link: string; pubDate: string; source: string };

const feeds: Feed[] = [
  { name: 'IT之家', url: 'https://www.ithome.com/rss/', region: 'cn', topics: ['tech'] },
  { name: '少数派', url: 'https://sspai.com/feed', region: 'cn', topics: ['tech'] },
  { name: '36氪', url: 'https://36kr.com/feed', region: 'cn', topics: ['tech', 'finance', 'ai'] },
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', region: 'intl', topics: ['tech', 'ai'] },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', region: 'intl', topics: ['tech'] },
  { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', region: 'intl', topics: ['ai'] },
];

const decodeText = (value = '') => value
  .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, ' ').trim();

const tagValue = (xml: string, tag: string) => decodeText(xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]);
const atomLink = (xml: string) => decodeText(xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i)?.[1]);

const parseFeed = (xml: string, source: string): NewsItem[] => Array.from(xml.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)).flatMap((match) => {
  const block = match[1];
  const title = tagValue(block, 'title');
  const link = tagValue(block, 'link') || atomLink(block);
  const pubDate = tagValue(block, 'pubDate') || tagValue(block, 'published') || tagValue(block, 'updated');
  if (!title || !link || !pubDate || Number.isNaN(Date.parse(pubDate))) return [];
  return [{ title, link, pubDate: new Date(pubDate).toISOString(), source }];
});

const fetchFeed = async (feed: Feed) => {
  const response = await fetch(feed.url, {
    headers: { 'User-Agent': 'My-Space-News/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8' },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`${feed.name} returned ${response.status}`);
  return parseFeed(await response.text(), feed.name).slice(0, 12);
};

const cache = new Map<string, { expiresAt: number; body: unknown }>();

export const loadNews = async (region: Region, topic: Topic) => {
  const key = `${region}:${topic}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.body;
  const selected = feeds.filter((feed) => (region === 'all' || feed.region === region) && (topic === 'all' || feed.topics.includes(topic)));
  const settled = await Promise.allSettled(selected.map(fetchFeed));
  const successful = settled.flatMap((result, index) => result.status === 'fulfilled' && result.value.length > 0 ? [{ feed: selected[index], items: result.value }] : []);
  const body = {
    items: successful.flatMap(({ items }) => items).sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate)).slice(0, 36),
    sources: successful.map(({ feed, items }) => ({ name: feed.name, count: items.length })),
    failedSources: settled.flatMap((result, index) => result.status === 'rejected' || result.value.length === 0 ? [selected[index].name] : []),
    updatedAt: new Date().toISOString(),
  };
  cache.set(key, { expiresAt: Date.now() + 5 * 60 * 1000, body });
  return body;
};
