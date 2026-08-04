const STORAGE_KEY = 'my-space-background-sequence-v1';

type BackgroundSequence = {
  version: string;
  order: string[];
  cursor: number;
};

const hash = (value: string) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
};

const randomFromSeed = (seed: number) => {
  let state = seed || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const versionFor = (photoIds: string[]) => [...photoIds].sort().join('|');

const shuffle = (photoIds: string[], version: string) => {
  const order = [...photoIds];
  const random = randomFromSeed(hash(version));
  for (let index = order.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [order[index], order[next]] = [order[next], order[index]];
  }
  return order;
};

const readSequence = (): BackgroundSequence | null => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BackgroundSequence>;
    if (
      typeof parsed.version !== 'string'
      || !Array.isArray(parsed.order)
      || !parsed.order.every((id) => typeof id === 'string')
      || !Number.isInteger(parsed.cursor)
    ) return null;
    return { version: parsed.version, order: parsed.order, cursor: parsed.cursor };
  } catch {
    return null;
  }
};

const writeSequence = (sequence: BackgroundSequence) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sequence));
  } catch {
    // Local storage can be unavailable in privacy-restricted browsing modes.
  }
};

const getSequence = (photoIds: string[]) => {
  const version = versionFor(photoIds);
  const stored = readSequence();
  if (stored && stored.version === version && stored.order.length === photoIds.length) return stored;
  const sequence = { version, order: shuffle(photoIds, version), cursor: 0 };
  writeSequence(sequence);
  return sequence;
};

export const getBackgroundCandidateIds = (photoIds: string[]) => {
  if (photoIds.length === 0) return [];
  const sequence = getSequence(photoIds);
  const start = ((sequence.cursor % sequence.order.length) + sequence.order.length) % sequence.order.length;
  return Array.from({ length: sequence.order.length }, (_, offset) => sequence.order[(start + offset) % sequence.order.length]);
};

export const advanceBackgroundSequence = (photoIds: string[], selectedPhotoId: string) => {
  if (photoIds.length === 0) return;
  const sequence = getSequence(photoIds);
  const selectedIndex = sequence.order.indexOf(selectedPhotoId);
  if (selectedIndex < 0) return;
  writeSequence({ ...sequence, cursor: (selectedIndex + 1) % sequence.order.length });
};
