import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL ?? 'https://subodhgautam.github.io';
const base = process.env.BASE_PATH ?? '/blog';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        dark: 'gruvbox-dark-soft',
        light: 'gruvbox-light-medium',
      },
      wrap: true,
    },
  },
  devToolbar: {
    enabled: false,
  },
});
