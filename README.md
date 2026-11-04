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

1. Create the file under any topic folder:

   ```text
   src/content/notes/networking/how-bgp-picks-a-path.md
   → /blog/topics/notes/networking/how-bgp-picks-a-path/
   ```

2. Write Markdown. Frontmatter is **optional**:

   ```md
   # How BGP picks a path

   Open with the problem or the question.

   ## A section heading

   Explain the idea with a small example.
   ```

   The title comes from the first heading (or filename), the description from
   the first paragraph, and the date from the file's git history. Add frontmatter
   only when you want to override something:

   ```yaml
   ---
   title: 'How BGP picks a path'          # optional
   description: 'A short summary.'        # optional
   pubDate: 2026-11-03                    # optional
   updatedDate: 2026-11-10                # optional
   tags: ['bgp', 'routing']
   draft: false
   ---
   ```

3. Code fences get syntax highlighting, and a sidebar table of contents is
   generated from `##` and `###` headings.

## Writing a guide

1. Create the file under any topic folder:

   ```text
   src/content/guides/networking/reading-the-network-stack.md
   → /blog/guides/networking/reading-the-network-stack/
   ```

2. Start with a first-level heading and `##` sections:

   ```md
   # Reading the network stack

   Open with the outcome.

   ## Start with the program

   ## Follow the route

   ## Triage checklist
   ```

   The `##` sections become the collapsible contents list at the top of the
   guide and the floating **Contents** button that appears once that list has
   scrolled away. `###` headings appear as indented entries.

3. Optional frontmatter controls ordering and level:

   ```yaml
   ---
   level: 'Beginner'
   order: 1
   draft: false
   ---
   ```

`order` controls where a guide sits within its topic. Lower numbers come first.
Unordered guides sort newest first.

### Frontmatter reference

Every field is optional.

| Field | Notes |
| --- | --- |
| `title` | Defaults to the first heading, then the filename. |
| `description` | Defaults to the first paragraph. |
| `pubDate` | Defaults to the file's first git commit, then its timestamp. |
| `updatedDate` | Defaults to the latest git commit. Shown when it differs from the publish date. |
| `tags` | Array of short strings. Defaults to `[]`. |
| `draft` | `true` hides the entry from the site, search, and RSS. |
| `level` | Guides only: `Beginner`, `Intermediate`, or `Advanced`. |
| `order` | Guides only: number used to sort guides inside a topic. |

Drafts are filtered out everywhere, so you can commit work in progress.

## Adding a new topic

Create a folder and add a note or guide. Nothing else is required:

```text
src/content/notes/physics/first-law.md
src/content/guides/physics/motion-basics.md
```

A **Physics** topic card, topic page, counts, search entries, and sitemap URLs
appear on the next build. The folder name is the slug, so keep it lowercase
with hyphens instead of spaces.

To control the wording and look without touching code, add a `_topic.json` to
the topic folder (either collection; notes wins if both exist):

```text
src/content/notes/physics/_topic.json
```

```json
{
  "label": "Physics",
  "description": "Motion, forces, and the models that make them predictable.",
  "accent": "#a8c98f",
  "icon": "book",
  "order": 1
}
```

Every key is optional — include only what you want to override:

| Key | Notes |
| --- | --- |
| `label` | Display name. Defaults to the title-cased folder name. |
| `description` | Shown on topic cards and the topic page. |
| `accent` | Hex color for the card badge and accents. |
| `icon` | One of the icons in `src/components/Icon.astro` (`book`, `network`, `terminal`, `shield`, `powershell`, `layers`, …). |
| `order` | Sort position for topics that are not declared in `TOPICS`. |

The file is JSON on purpose: the content loader only scans `.md` / `.mdx`, so it
is never treated as an article. A missing or malformed `_topic.json` is ignored
and the generated values are used instead.

`TOPICS` in `src/lib/site.ts` still works for the curated topics and acts as a
fallback; a `_topic.json` takes precedence over it. A folder with no published
note or guide never appears.

## Where things live

```text
src/
  components/        Header, footer, cards, search, newsletter, ambience, icons
  content/
    notes/<topic>/   Short field notes
    guides/<topic>/  Ordered course guides
  content.config.ts  Schema for notes and guides (all fields optional)
  layouts/           Base HTML shell
  lib/               Site/topic metadata, entry dates and titles, note and guide helpers
  pages/
    guides/          Guide catalog and individual guide pages
    topics/          Topics catalog, notes archive, and note pages
    index.astro      Search-first home page
  styles/global.css  Design system, layout, and prose styles
public/
  wallpapers/        Reading-room backdrop SVGs
  favicon.svg, .nojekyll
templates/
  post.md            Starter for a note (frontmatter optional)
  guide.md           Starter for a guide (frontmatter optional)
  topic.json         Optional metadata for a new topic folder
```

`src/content/notes/meta/lorem-ipsum-reading-room.md` is placeholder content for
checking typography, code blocks, and the reading room. Delete the file (and the
`meta` entry in `src/lib/site.ts`, if you added one) when you no longer want the
Meta topic. `src/content/guides/networking/reading-the-network-stack.md` is a
sample guide that demonstrates both the collapsible table of contents and the
floating **Contents** button.

## Automatic dates

Entries without a `pubDate` use the file's first git commit date. Existing files
with `pubDate` keep that date. `updatedDate` follows the latest commit unless you
set it explicitly. Before the first commit, a new file falls back to its own
timestamp, so it still appears in the right order while you are writing.

Leave the field out — or leave the line empty (`pubDate:`). Both mean "automatic".
Only a real value is treated as an override.

The deployment workflow checks out the full git history (`fetch-depth: 0`) so
these dates survive on GitHub Pages. If you copy the project without its `.git`
folder, add `pubDate` to keep dates stable.

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
