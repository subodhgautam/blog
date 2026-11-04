import { getTopic, TOPICS, topicSortOrder, type Topic } from './site';
import { getPublishedPosts, postTopic } from './posts';
import { getPublishedGuides, guideTopic } from './guides';

/**
 * Every topic the site should show: the ones declared in `TOPICS`, plus any
 * topic folder that contains a published note or guide.
 *
 * Adding `src/content/notes/physics/first-note.md` is enough for a Physics
 * card, topic page, counts, search entry, and RSS item to appear. To choose the
 * label, description, color, or icon, drop a `_topic.json` in the same folder.
 */
export async function getAllTopics(): Promise<Topic[]> {
  const [posts, guides] = await Promise.all([getPublishedPosts(), getPublishedGuides()]);

  const discovered = new Set<string>();
  for (const post of posts) discovered.add(postTopic(post).slug);
  for (const guide of guides) discovered.add(guideTopic(guide).slug);

  // A site with no published content still shows its configured topics.
  if (discovered.size === 0) {
    return Object.keys(TOPICS).map((slug) => getTopic(slug));
  }

  // Declared topics keep their custom order; folder-only topics follow, sorted
  // by their optional `order`, then alphabetically.
  const ordered = Object.keys(TOPICS)
    .filter((slug) => discovered.has(slug))
    .map((slug) => getTopic(slug));
  const extras = [...discovered]
    .filter((slug) => !TOPICS[slug])
    .sort(
      (a, b) =>
        topicSortOrder(a) - topicSortOrder(b) || a.localeCompare(b),
    );

  return [...ordered, ...extras.map((slug) => getTopic(slug))];
}
