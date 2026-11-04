import { getCollection, type CollectionEntry } from 'astro:content';
import { getTopic, readingTime, topicFromId } from './site';

export type Guide = CollectionEntry<'guides'>;

export function guideId(guide: Guide): string {
  return guide.id.replace(/\.(md|mdx)$/i, '');
}

export function guidePath(guide: Guide): string {
  return `/guides/${guideId(guide)}/`;
}

export function guideTopic(guide: Guide) {
  return getTopic(topicFromId(guideId(guide)));
}

export function guideReadTime(guide: Guide): string {
  return readingTime(guide.body ?? '');
}

export function guideSections(guide: Guide): number {
  return (guide.body ?? '').match(/^##\s+/gm)?.length ?? 0;
}

export async function getPublishedGuides(): Promise<Guide[]> {
  const guides = await getCollection('guides', ({ data }) => data.draft !== true);
  return guides.sort(
    (a, b) =>
      a.data.order - b.data.order ||
      b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export async function getGuidesByTopic(topic: string): Promise<Guide[]> {
  const guides = await getPublishedGuides();
  return guides.filter((guide) => topicFromId(guideId(guide)) === topic);
}
