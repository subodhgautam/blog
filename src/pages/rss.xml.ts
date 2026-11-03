import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';
import { getPublishedPosts, postPath, postTopic } from '../lib/posts';
import { href } from '../lib/url';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();
  const site = new URL(href('/'), context.site ?? 'https://subodhgautam.github.io');

  return rss({
    title: SITE.title,
    description: SITE.description,
    site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: href(postPath(post)),
      categories: [postTopic(post).label, ...post.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
};
