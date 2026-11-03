# Layer 8

A reading-first Astro blog for networking, scripting, Linux, and security notes.
It uses Astro content collections, a client-side search index, a switchable
reading-room backdrop, RSS, sitemap, and a GitHub Pages deployment workflow.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321/blog/
npm run build    # static site in dist/
npm run preview  # serve the production build
npm run check    # Astro + TypeScript diagnostics
```

## Writing a post

1. Pick a topic folder under `src/content/`:

   ```text
   src/content/
     networking/
     scripting/
     linux/
     security/
     notes/
   ```

2. Create a Markdown file. The URL is built from the folder and filename:

   ```text
   src/content/networking/how-bgp-picks-a-path.md
   → /blog/writing/networking/how-bgp-picks-a-path/
   ```

3. Copy `templates/post.md` or start with this frontmatter:

   ```yaml
   ---
   title: 'How BGP picks a path'
   description: 'A short summary used on cards, in search, and in SEO tags.'
   pubDate: 2026-11-03
   tags: ['bgp', 'routing']
   draft: false
   ---
   ```

4. Write the body in Markdown. Code fences get syntax highlighting and a table
   of contents is generated from `##` and `###` headings.

### Frontmatter reference

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Post title. |
| `description` | yes | One-sentence summary. |
| `pubDate` | yes | `YYYY-MM-DD` or an ISO timestamp. |
| `updatedDate` | no | Shows an “Updated” label. |
| `tags` | no | Array of short strings. Defaults to `[]`. |
| `draft` | no | `true` hides the post from the site, search, and RSS. |

Drafts are filtered out everywhere, so you can commit work in progress.

## Adding a new topic

Topics are configured in `src/lib/site.ts`:

```ts
// src/lib/site.ts
export const TOPICS = {
  cloud: {
    slug: 'cloud',
    label: 'Cloud',
    description: 'IAM, networking, and the parts of cloud that bite.',
    accent: '#34d399',
    icon: 'network',
  },
};
```

Add an icon if you want a custom mark in `src/components/Icon.astro`. Then create
`src/content/cloud/` and start writing. The home page, topic page, navigation
counts, and sitemap update automatically.

## Where things live

```text
src/
  components/      Header, footer, cards, search, ambience, icons
  content/         Markdown posts, grouped by topic folder
  content.config.ts  Frontmatter schema
  layouts/         Base HTML shell
  lib/             Site/topic metadata, post helpers, URL helpers
  pages/           Home, writing archive, posts, topics, about, RSS, search index
  styles/global.css  Design system and prose styles
public/
  wallpapers/      Reading-room backdrop SVGs
  favicon.svg, .nojekyll
templates/post.md  Frontmatter starter for new posts
```

`src/content/notes/lorem-ipsum-reading-room.md` is placeholder content for
checking typography, code blocks, and the reading room. Delete it when the notes
topic has real posts.

## Reading room

The palette button in the header opens the reading-room panel. It changes the
cozy backdrop behind the page without touching text contrast or the color theme:

- **Lamp** — warm paper glow, no image
- **Hearth** — amber lantern bokeh (default)
- **Rain** — a quiet window at night
- **Grove** — mossy morning light
- **Dusk** — plum evening haze

Options live in `AMBIENCES` in `src/lib/site.ts`, and the backdrops are SVGs in
`public/wallpapers/`. The choice is stored in `localStorage` under `ambient`;
light/dark mode is separate and stored under `theme`.

## Site configuration

The site name, description, author, GitHub link, and topic colors/icons live in
`src/lib/site.ts`. The deployed URL and base path live in `astro.config.mjs`:

```js
const site = process.env.SITE_URL ?? 'https://subodhgautam.github.io';
const base = process.env.BASE_PATH ?? '/blog';
```

Change these if you rename the repository, move to a custom domain, or deploy to
a user/organization site.

- Project site (`username.github.io/blog`): `site = https://username.github.io`, `base = /blog`
- User site (`username.github.io`): `base = /`
- Custom domain: `site = https://example.com`, `base = /`

## Deploying to GitHub Pages

The workflow at `.github/workflows/deploy.yml` builds on every push to `main` and
deploys the `dist/` artifact with GitHub Pages.

One-time setup in the repository:

1. Push this project to GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main` or run the workflow manually.

The first deploy publishes at `https://<user>.github.io/<repo>/`.

## Search

`src/pages/search.json.ts` generates a static search index at build time. The
home page search bar fetches it on first focus and scores matches across titles,
descriptions, tags, topics, and post bodies. No server or external search service
is required.

## Notes

- The site is fully static and has no runtime dependencies.
- `public/.nojekyll` keeps GitHub Pages from ignoring Astro's `_astro/` assets.
- RSS is available at `/blog/rss.xml` and the sitemap at `/blog/sitemap-index.xml`.
