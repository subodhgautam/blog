export const SITE = {
  name: 'Layer 8',
  tagline: 'Notes from the command line',
  title: 'Layer 8 — Field notes for engineers',
  description:
    'Clear, practical notes on networking, scripting, Linux, and security. Written for people who would rather understand the system than memorize the commands.',
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
  notes: {
    slug: 'notes',
    label: 'Notes',
    description:
      'Long-form samples, site notes, and quiet experiments with the reading room.',
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

export function getTopic(slug: string): Topic {
  return (
    TOPICS[slug] ?? {
      slug,
      label: titleCase(slug),
      description: 'Notes and field guides filed under this topic.',
      accent: '#c9ad86',
      icon: 'book',
    }
  );
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
