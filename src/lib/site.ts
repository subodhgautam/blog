import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SITE = {
  name: 'Layer 8',
  tagline: 'Guides from the command line',
  title: 'Layer 8 — Guides and field notes for engineers',
  description:
    'Structured guides and practical field notes on networking, scripting, Linux, and security. Written for people who would rather understand the system than memorize the commands.',
  author: 'Subodh Gautam',
  github: 'https://github.com/subodhgautam',
};

export type IconName =
  | 'layers'
  | 'network'
  | 'powershell'
  | 'terminal'
  | 'shield'
  | 'search'
  | 'arrow-right'
  | 'arrow-left'
  | 'clock'
  | 'tag'
  | 'sun'
  | 'moon'
  | 'menu'
  | 'close'
  | 'rss'
  | 'github'
  | 'book'
  | 'palette'
  | 'check';

export type Topic = {
  slug: string;
  label: string;
  description: string;
  accent: string;
  icon: IconName;
};

export const TOPICS: Record<string, Topic> = {
  networking: {
    slug: 'networking',
    label: 'Networking',
    description:
      'Packets, routes, DNS, and all the plumbing that quietly keeps the internet moving.',
    accent: '#6fc7bc',
    icon: 'network',
  },
  scripting: {
    slug: 'scripting',
    label: 'Scripting',
    description:
      'PowerShell and shell automation with an emphasis on objects, pipelines, and sane error handling.',
    accent: '#8fb4ef',
    icon: 'powershell',
  },
  linux: {
    slug: 'linux',
    label: 'Linux',
    description:
      'Services, permissions, and the command-line habits that make a Linux box feel like home.',
    accent: '#e0b06b',
    icon: 'terminal',
  },
  security: {
    slug: 'security',
    label: 'Security',
    description:
      'Threat models, hardening, and the fundamentals behind the headlines — explained without fear.',
    accent: '#e39b98',
    icon: 'shield',
  },
  meta: {
    slug: 'meta',
    label: 'Meta',
    description:
      'Site notes, samples, and quiet experiments with the reading room.',
    accent: '#c9ad86',
    icon: 'book',
  },
};

export type Ambience = {
  id: string;
  label: string;
  note: string;
  file?: string;
};

export const AMBIENCES: Ambience[] = [
  { id: 'lamp', label: 'Lamp', note: 'Warm paper glow' },
  { id: 'hearth', label: 'Hearth', note: 'Amber lantern bokeh', file: 'hearth.svg' },
  { id: 'rain', label: 'Rain', note: 'A quiet window at night', file: 'rain.svg' },
  { id: 'grove', label: 'Grove', note: 'Mossy morning light', file: 'grove.svg' },
  { id: 'dusk', label: 'Dusk', note: 'Plum evening haze', file: 'dusk.svg' },
];

export function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// New topic folders inherit a color and icon from these pools so they still
// look intentional without being declared in `TOPICS` first.
const FALLBACK_ACCENTS = [
  '#6fc7bc',
  '#8fb4ef',
  '#e0b06b',
  '#e39b98',
  '#c9ad86',
  '#a8c98f',
  '#b9a6e6',
  '#e6b0a6',
];

const FALLBACK_ICONS: IconName[] = ['network', 'powershell', 'terminal', 'shield', 'book'];

// Keep this in sync with the union above. It validates `icon` values that come
// from a topic's `_topic.json`, so a typo cannot render a blank icon.
const KNOWN_ICONS: IconName[] = [
  'layers',
  'network',
  'powershell',
  'terminal',
  'shield',
  'search',
  'arrow-right',
  'arrow-left',
  'clock',
  'tag',
  'sun',
  'moon',
  'menu',
  'close',
  'rss',
  'github',
  'book',
  'palette',
  'check',
];

type FolderTopicMeta = {
  label?: unknown;
  description?: unknown;
  accent?: unknown;
  icon?: unknown;
  order?: unknown;
};

const topicMetaCache = new Map<string, FolderTopicMeta | null>();

function textField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && (KNOWN_ICONS as string[]).includes(value);
}

/**
 * Optional per-folder metadata:
 *
 *   src/content/notes/physics/_topic.json
 *   src/content/guides/physics/_topic.json
 *
 * It is JSON rather than Markdown so the content loader never mistakes it for
 * a note or a guide. When a topic exists in both collections, the notes folder
 * wins. Missing or malformed files simply fall back to generated values.
 */
function folderTopicMeta(slug: string): FolderTopicMeta | null {
  const cached = topicMetaCache.get(slug);
  if (cached !== undefined) return cached;

  let meta: FolderTopicMeta | null = null;
  for (const collection of ['notes', 'guides']) {
    const file = resolve(process.cwd(), 'src', 'content', collection, slug, '_topic.json');
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        meta = parsed as FolderTopicMeta;
        break;
      }
    } catch {
      // No metadata file, or it is malformed: use generated values instead.
    }
  }

  topicMetaCache.set(slug, meta);
  return meta;
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

function slugHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Topic display data, resolved in this order:
 *
 *   1. `_topic.json` inside the topic folder
 *   2. the `TOPICS` entry in this file
 *   3. generated label/description/color/icon
 *
 * So a new folder can describe itself without touching code, while the entries
 * below still act as curated defaults.
 */
export function getTopic(slug: string): Topic {
  const declared = TOPICS[slug];
  const meta = folderTopicMeta(slug);
  const hash = slugHash(slug);

  const label = textField(meta?.label) || declared?.label || titleCase(slug);
  const description =
    textField(meta?.description) ||
    declared?.description ||
    `Guides and field notes filed under ${label}.`;

  const accent = textField(meta?.accent);
  const icon = meta?.icon;

  return {
    slug,
    label,
    description,
    accent: isHexColor(accent)
      ? accent
      : declared?.accent || FALLBACK_ACCENTS[hash % FALLBACK_ACCENTS.length],
    icon: isIconName(icon)
      ? icon
      : declared?.icon || FALLBACK_ICONS[hash % FALLBACK_ICONS.length],
  };
}

/**
 * Optional `order` from `_topic.json`, used to sort topics that are not listed
 * in `TOPICS`. Lower numbers come first; unordered topics fall to the end.
 */
export function topicSortOrder(slug: string): number {
  const order = folderTopicMeta(slug)?.order;
  return typeof order === 'number' && Number.isFinite(order)
    ? order
    : Number.MAX_SAFE_INTEGER;
}

export function topicFromId(id: string): string {
  return id.split('/')[0] ?? 'notes';
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function readingTime(body: string): string {
  const words = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~\-[\]()]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}
