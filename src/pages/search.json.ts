import type { APIRoute } from 'astro';
import { getPublishedPosts, postPath, postTopic } from '../lib/posts';
import { getPublishedGuides, guidePath, guideTopic } from '../lib/guides';
import { href } from '../lib/url';

const clean = (body: string) =>
  body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~|[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const guides = await getPublishedGuides();

  const notes = posts.map((post) => {
    const topic = postTopic(post);

    return {
      title: post.data.title,
      description: post.data.description,
      category: topic.slug,
      categoryLabel: topic.label,
      accent: topic.accent,
      tags: post.data.tags,
      url: href(postPath(post)),
      body: clean(post.body ?? ''),
    };
  });

  const guideEntries = guides.map((guide) => {
    const topic = guideTopic(guide);

    return {
      title: guide.data.title,
      description: guide.data.description,
      category: topic.slug,
      categoryLabel: `Guide · ${topic.label}`,
      accent: topic.accent,
      tags: guide.data.tags,
      url: href(guidePath(guide)),
      body: clean(guide.body ?? ''),
    };
  });

  return new Response(JSON.stringify([...guideEntries, ...notes]), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
