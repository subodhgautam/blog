import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTopic, titleCase, topicFromId } from './site';

/**
 * The parts of a content entry these helpers need. Astro's `CollectionEntry`
 * satisfies this shape structurally.
 */
export interface ContentEntry {
  id: string;
  body?: string;
  filePath?: string;
  data: {
    title?: string;
    description?: string;
    pubDate?: Date;
    updatedDate?: Date;
  };
}

export interface EntryDates {
  published: Date;
  updated: Date;
}

// Git is the source of truth once a file is committed. The cache keeps a build
// from shelling out once per card for the same file.
const dateCache = new Map<string, EntryDates>();

function parseDates(value: string | null): Date[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Date(line))
    .filter((date) => !Number.isNaN(date.valueOf()));
}

function gitOutput(args: string[], file: string): string | null {
  try {
    const output = execFileSync('git', [...args, '--', file], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output || null;
  } catch {
    // Not a git repo, git is unavailable, or the file has no history.
    return null;
  }
}

function fileFallback(file: string | null): Date {
  if (file) {
    try {
      const stats = statSync(file);
      if (stats.birthtimeMs > 0) return new Date(stats.birthtimeMs);
      return new Date(stats.mtimeMs);
    } catch {
      /* fall through to now */
    }
  }
  return new Date();
}

function resolveFromGit(file: string | null): EntryDates {
  if (!file) {
    const now = new Date();
    return { published: now, updated: now };
  }

  // `--follow` keeps the original date across renames. Git lists the newest
  // "added" commit first, so the last entry is the file's real creation.
  const additions = parseDates(
    gitOutput(['log', '--follow', '--format=%aI', '--diff-filter=A'], file),
  );
  const lastCommit = parseDates(gitOutput(['log', '-1', '--format=%aI'], file))[0] ?? null;
  const fallback = fileFallback(file);

  const published = additions.at(-1) ?? lastCommit ?? fallback;
  const updated = lastCommit ?? published;

  return {
    published,
    updated: updated < published ? published : updated,
  };
}

function baseDates(entry: ContentEntry): EntryDates {
  const key = entry.filePath ? resolve(entry.filePath) : entry.id;
  const cached = dateCache.get(key);
  if (cached) return cached;

  const dates = resolveFromGit(entry.filePath ? resolve(entry.filePath) : null);
  dateCache.set(key, dates);
  return dates;
}

/**
 * Publication and update dates.
 *
 * Priority: frontmatter, then the first/last git commit for the file, then the
 * file's own timestamp. This means existing posts keep their declared dates and
 * new files need no date at all.
 */
export function entryDates(entry: ContentEntry): EntryDates {
  const base = baseDates(entry);
  const published = entry.data.pubDate ?? base.published;
  const updated = entry.data.updatedDate ?? base.updated;

  return {
    published,
    updated: updated < published ? published : updated,
  };
}

export function entryPublished(entry: ContentEntry): Date {
  return entryDates(entry).published;
}

export function entryUpdated(entry: ContentEntry): Date {
  return entryDates(entry).updated;
}

export function entryShowUpdated(entry: ContentEntry): boolean {
  if (entry.data.updatedDate) return true;
  const { published, updated } = entryDates(entry);
  return updated.valueOf() - published.valueOf() > 24 * 60 * 60 * 1000;
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstHeading(body: string): string {
  const withoutCode = body.replace(/```[\s\S]*?```/g, '');
  const match = withoutCode.match(/^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/m);
  return match ? stripInlineMarkdown(match[1]) : '';
}

function firstParagraph(body: string): string {
  const withoutCode = body.replace(/```[\s\S]*?```/g, '');
  const blocks = withoutCode.split(/\r?\n\s*\r?\n/);

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    if (/^(#{1,6}\s|[-*+]\s|\d+\.\s|>|\||<)/.test(block)) continue;
    const text = stripInlineMarkdown(block);
    if (text) return text.length > 190 ? `${text.slice(0, 187).trimEnd()}…` : text;
  }

  return '';
}

/** Frontmatter title, then the first Markdown heading, then the filename. */
export function entryTitle(entry: ContentEntry): string {
  const declared = entry.data.title?.trim();
  if (declared) return declared;

  const heading = firstHeading(entry.body ?? '');
  if (heading) return heading;

  const segment = entry.id.split('/').filter(Boolean).pop() ?? entry.id;
  const cleaned = segment
    .replace(/\.(md|mdx)$/i, '')
    .replace(/^\d{4}-\d{2}-\d{2}[-_]?/, '');
  return titleCase(cleaned) || 'Untitled';
}

/** Frontmatter description, then the first real paragraph, then a topic line. */
export function entryDescription(entry: ContentEntry, kind: 'note' | 'guide' = 'note'): string {
  const declared = entry.data.description?.trim();
  if (declared) return declared;

  const paragraph = firstParagraph(entry.body ?? '');
  if (paragraph) return paragraph;

  const topic = getTopic(topicFromId(entry.id));
  return kind === 'guide'
    ? `A guide filed under ${topic.label}.`
    : `A field note filed under ${topic.label}.`;
}
