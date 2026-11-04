import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';
import { getPublishedPosts, postPath, postTopic } from '../lib/posts';
import { getPublishedGuides, guidePath, guideTopic } from '../lib/guides';
import { href } from '../lib/url';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();
  const guides = await getPublishedGuides();
  const site = new URL(href('/'), context.site ?? 'https://subodhgautam.github.io');

  const items = [
    ...guides.map((guide) => ({
      title: guide.data.title,
      description: guide.data.description,
      pubDate: guide.data.pubDate,
      link: href(guidePath(guide)),
      categories: ['Guide', guideTopic(guide).label, ...guide.data.tags],
    })),
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: href(postPath(post)),
      categories: ['Note', postTopic(post).label, ...post.data.tags],
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: SITE.title,
    description: SITE.description,
    site,
    items,
    customData: '<language>en-us</language>',
  });
};
