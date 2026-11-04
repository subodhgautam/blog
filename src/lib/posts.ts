import { getCollection, type CollectionEntry } from 'astro:content';
import { readingTime, topicFromId, getTopic } from './site';

export type Post = CollectionEntry<'notes'>;

export function postId(post: Post): string {
  return post.id.replace(/\.(md|mdx)$/i, '');
}

export function postPath(post: Post): string {
  return `/topics/notes/${postId(post)}/`;
}

export function postTopic(post: Post) {
  return getTopic(topicFromId(postId(post)));
}

export function postReadTime(post: Post): string {
  return readingTime(post.body ?? '');
}

export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('notes', ({ data }) => data.draft !== true);
  return posts.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );
}

export async function getPostsByTopic(topic: string): Promise<Post[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => topicFromId(postId(post)) === topic);
}

export function relatedPosts(posts: Post[], current: Post, limit = 3): Post[] {
  const currentTags = new Set(current.data.tags);
  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => {
      const sameTopic = postTopic(post).slug === postTopic(current).slug ? 2 : 0;
      const sharedTags = post.data.tags.filter((tag) => currentTags.has(tag)).length;
      return { post, score: sameTopic + sharedTags };
    })
    .sort((a, b) => b.score - a.score || b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf())
    .slice(0, limit)
    .map(({ post }) => post);
}
