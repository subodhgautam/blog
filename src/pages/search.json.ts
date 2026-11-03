import type { APIRoute } from 'astro';
import { getPublishedPosts, postPath, postTopic } from '../lib/posts';
import { href } from '../lib/url';

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();

  const index = posts.map((post) => {
    const topic = postTopic(post);

    return {
      title: post.data.title,
      description: post.data.description,
      category: topic.slug,
      categoryLabel: topic.label,
      accent: topic.accent,
      tags: post.data.tags,
      url: href(postPath(post)),
      body: (post.body ?? '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/[#>*_`~|[\]()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000),
    };
  });

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
