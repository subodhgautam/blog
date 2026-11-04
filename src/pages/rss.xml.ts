import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';
import { entryDescription, entryPublished, entryTitle } from '../lib/content';
import { getPublishedPosts, postPath, postTopic } from '../lib/posts';
import { getPublishedGuides, guidePath, guideTopic } from '../lib/guides';
import { href } from '../lib/url';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();
  const guides = await getPublishedGuides();
  const site = new URL(href('/'), context.site ?? 'https://subodhgautam.github.io');

  const items = [
    ...guides.map((guide) => ({
      title: entryTitle(guide),
      description: entryDescription(guide, 'guide'),
      pubDate: entryPublished(guide),
      link: href(guidePath(guide)),
      categories: ['Guide', guideTopic(guide).label, ...guide.data.tags],
    })),
    ...posts.map((post) => ({
      title: entryTitle(post),
      description: entryDescription(post, 'note'),
      pubDate: entryPublished(post),
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
