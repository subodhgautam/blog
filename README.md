# Layer 8

A reading-first Astro site for guides and field notes on networking, scripting,
Linux, and security. It uses Astro content collections, a client-side search
index, a switchable reading-room backdrop, RSS, sitemap, and a GitHub Pages
deployment workflow.

## Quick start

```bash
npm install
npm run dev      # http://localhost:4321/blog/
npm run build    # static site in dist/
npm run preview  # serve the production build
npm run check    # Astro + TypeScript diagnostics
```

## Content model

The library has two kinds of content, both filed by topic:

- **Guides** are ordered courses. Each guide is one long page with a table of
  contents that stays collapsed until the reader opens it.
- **Notes** are short reference pieces: a command, a failure mode, a worked
  example.

Notes live under **Topics**; guides have their own archive at `/guides/`. URLs
are built from the collection, topic folder, and filename.

## Writing a note

1. Create the file under a topic folder:

   ```text
   src/content/notes/networking/how-bgp-picks-a-path.md
   → /blog/topics/notes/networking/how-bgp-picks-a-path/
   ```

2. Copy `templates/post.md` or start with this frontmatter:

   ```yaml
   ---
   title: 'How BGP picks a path'
   description: 'A short summary used on cards, in search, and in SEO tags.'
   pubDate: 2026-11-03
   tags: ['bgp', 'routing']
   draft: false
   ---
   ```

3. Write the body in Markdown. Code fences get syntax highlighting, and a
   sidebar table of contents is generated from `##` and `###` headings.

## Writing a guide

1. Create the file under a topic folder:

   ```text
   src/content/guides/networking/reading-the-network-stack.md
   → /blog/guides/networking/reading-the-network-stack/
   ```

2. Copy `templates/guide.md` or start with this frontmatter:

   ```yaml
   ---
   title: 'Reading the network stack'
   description: 'A guided tour from socket to wire.'
   pubDate: 2026-11-01
   updatedDate: 2026-11-03
   level: 'Beginner'
   order: 1
   tags: ['tcp-ip', 'dns']
   draft: false
   ---
   ```

3. Use `##` sections for the main beats of the course. They become the
   collapsible table of contents at the top of the guide and the floating
   **Contents** button that stays available while reading. `###` headings appear
   as indented entries.

`order` controls where a guide sits within its topic. Lower numbers come first.

### Frontmatter reference

| Field | Required | Notes |
| --- | --- | --- |
| `title` | yes | Entry title. |
| `description` | yes | One-sentence summary. |
| `pubDate` | yes | `YYYY-MM-DD` or an ISO timestamp. |
| `updatedDate` | no | Shows an “Updated” label. |
| `tags` | no | Array of short strings. Defaults to `[]`. |
| `draft` | no | `true` hides the entry from the site, search, and RSS. |
| `level` | guides only | `Beginner`, `Intermediate`, or `Advanced`. |
| `order` | guides only | Number used to sort guides inside a topic. |

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
`src/content/notes/cloud/` and/or `src/content/guides/cloud/` and start writing.
The home page, topic page, counts, and sitemap update automatically.

## Where things live

```text
src/
  components/        Header, footer, cards, search, newsletter, ambience, icons
  content/
    notes/<topic>/   Short field notes
    guides/<topic>/  Ordered course guides
  content.config.ts  Frontmatter schemas for notes and guides
  layouts/           Base HTML shell
  lib/               Site/topic metadata, note helpers, guide helpers, URLs
  pages/
    guides/          Guide catalog and individual guide pages
    topics/          Topics catalog, notes archive, and note pages
    index.astro      Search-first home page
  styles/global.css  Design system, layout, and prose styles
public/
  wallpapers/        Reading-room backdrop SVGs
  favicon.svg, .nojekyll
templates/
  post.md            Frontmatter starter for a note
  guide.md           Frontmatter starter for a guide
```

`src/content/notes/meta/lorem-ipsum-reading-room.md` is placeholder content for
checking typography, code blocks, and the reading room. Delete it when the Meta
topic has real posts. `src/content/guides/networking/reading-the-network-stack.md`
is a sample guide that demonstrates both the collapsible table of contents and
the floating **Contents** button.

## Newsletter signup

The home page includes a newsletter form in `src/components/Newsletter.astro`.
It validates the email and shows a success state, but it does **not** submit
anywhere yet. Connect it to a provider (Buttondown, Mailchimp, Formspree, etc.)
by adding the endpoint to `data-newsletter-endpoint` and replacing the client-side
success handler with a `fetch` call.

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

`src/pages/search.json.ts` generates a static search index at build time from
both notes and guides. The home page search bar fetches it on first focus and
scores matches across titles, descriptions, tags, topics, and bodies. No server
or external search service is required.

## Notes

- The site is fully static and has no runtime dependencies.
- `public/.nojekyll` keeps GitHub Pages from ignoring Astro's `_astro/` assets.
- RSS is available at `/blog/rss.xml` and the sitemap at `/blog/sitemap-index.xml`.
