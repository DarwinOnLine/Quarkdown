# Quarkdown

Zero-dependency Markdown SPA blog engine for GitHub Pages.

**Quarkdown** turns a folder of Markdown files into a fully-featured single-page blog — no build step, no bundler, no framework. Just HTML, JS, and your words.

## Features

- **SPA routing** — History API with async race-condition protection
- **Markdown rendering** — via [marked.js](https://marked.js.org/) (CDN)
- **Syntax highlighting** — via [highlight.js](https://highlightjs.org/) with optional line numbers
- **i18n** — multi-language support with auto-detection and language switcher
- **Blog engine** — post index, pagination with ellipsis, tags
- **Tag pages** — filterable `/blog/tag/{tag}` routes with pagination, post counts, and `/blog/tags` index page
- **Client-side search** — full-text search overlay (title, description, tags, content) with `Ctrl+K` / `Cmd+K` shortcut
- **Reading time** — estimated reading time displayed on posts
- **Table of contents** — floating sidebar TOC generated from h2/h3 headings, with scroll spy and click-outside-to-close
- **Lazy loading** — automatic `loading="lazy"` on all images
- **Light/Dark/System theme** — three-way toggle with OS detection and localStorage persistence
- **Canonical URLs** — dynamic `<link rel="canonical">` on every page
- **Open Graph builder** — static OG meta pages for GitHub Pages social sharing (including tag pages)
- **RSS feed builder** — generates RSS 2.0 feeds for each language
- **Sitemap builder** — generates `sitemap.xml` with smart lastmod dates (per-post and per-tag)
- **Embedded scripts** — execute `<script>` tags inside Markdown posts
- **Starfield 404** — interactive canvas animation with warp speed effect
- **Cursor dot** — decorative mouse-following dot (optional)
- **Analytics** — provider-agnostic page view tracking (Umami, Plausible, Fathom, Google Analytics, or custom)
- **Theming** — CSS custom properties for easy customization
- **Accessibility** — ARIA labels, roles, and states on all interactive elements
- **Zero build step** — works directly from a static file server

## Prerequisites

- **Node.js** (recommended) — to run the local dev server and build tools (OG builder, RSS builder)
- **Python 3** (optional) — alternative dev server if you can't install Node.js

## Quick Start

```bash
# Clone the repo
git clone https://github.com/DarwinOnLine/quarkdown.git my-blog
cd my-blog

# Copy the template as your site root
cp -r template/* .

# Install the pre-commit hook (rebuilds OG pages automatically)
cp hooks/pre-commit .git/hooks/pre-commit

# Start the dev server (default: port 8080)
npx http-server

# Or specify a custom port
npx http-server -p 3000
```

**Alternative (Python):** If you can't or don't want to install Node.js:

```bash
# Start the dev server (default: port 8000)
python3 server.py

# Or specify a custom port
python3 server.py 3000
```

## Configuration

```javascript
import { Quarkdown } from './src/quarkdown.js';

const app = new Quarkdown({
  // Required
  siteName: 'My Blog',
  baseUrl: 'https://username.github.io',

  // Content
  languages: ['en', 'fr'],        // Supported languages
  defaultLanguage: 'en',          // Fallback language
  postsDir: 'posts',              // Posts directory
  homeFile: 'home-{lang}.md',     // Home page Markdown file pattern
  postsPerPage: 10,               // Posts per page

  // Features
  cursorDot: true,                // Mouse-following dot
  starfield404: true,             // Starfield 404 page
  feedFileName: 'feed.xml',       // RSS feed (set to null to disable)
  externalLinksNewTab: true,      // Open external links in new tab
  toc: true,                      // Table of contents on posts (default: true)
  search: true,                   // Client-side search (default: true)
  themeToggle: true,              // Light/dark/system toggle (default: false)

  // Meta
  defaultImage: 'assets/images/default-og.png',

  // i18n
  translations: {
    en: {
      nav: { home: 'Home', blog: 'Blog' },
      blog: {
        title: 'Blog', noPosts: 'No posts yet.',
        readingTime: '{min} min read',
        toc: 'Table of contents',
        tagTitle: 'Tag: {tag}',
        allTags: 'Tags',
      },
      pagination: { previous: 'Previous', next: 'Next' },
      date: { locale: 'en-US' },
      search: { placeholder: 'Search articles...', noResults: 'No results found.' },
    },
    fr: {
      nav: { home: 'Accueil', blog: 'Blog' },
      blog: {
        title: 'Blog', noPosts: 'Aucun article.',
        readingTime: '{min} min de lecture',
        toc: 'Sommaire',
        tagTitle: 'Tag : {tag}',
        allTags: 'Tags',
      },
      pagination: { previous: 'Précédent', next: 'Suivant' },
      date: { locale: 'fr-FR' },
      search: { placeholder: 'Rechercher...', noResults: 'Aucun résultat.' },
    },
  },

  // Analytics (optional — see Analytics section below)
  analytics: {
    provider: 'umami',
    websiteId: 'your-website-id',
  },

  // Custom renderers (optional)
  renderHome: (html, ctx) => `<div>...</div>`,
  renderBlog: (data, ctx) => `<div>...</div>`,
  renderPost: (html, post, ctx, { readingTime }) => `<div>...</div>`,
  renderTag: (data, tag, ctx) => `<div>...</div>`,
  render404: (ctx) => `<div>...</div>`,
});

app.start();
```

## Content Structure

```
your-site/
├── index.html              # Main HTML shell
├── 404.html                # GitHub Pages 404 fallback
├── home-en.md              # Home page content (per language)
├── home-fr.md
├── posts/
│   ├── en/
│   │   ├── index.json      # Post index
│   │   └── my-post.md      # Post content
│   └── fr/
│       ├── index.json
│       └── mon-article.md
└── src/                    # Quarkdown source
```

## Post Index Format

`posts/{lang}/index.json`:

```json
[
  {
    "slug": "my-first-post",
    "title": "My First Post",
    "date": "2026-02-17",
    "description": "A short description for the listing.",
    "tags": ["Tech", "Tutorial"],
    "image": "assets/images/posts/my-first-post/cover.jpg",
    "i18nSlugs": { "fr": "mon-premier-article" }
  }
]
```

## Adding a Language

To add a new language (e.g. Spanish `es`):

1. **Create content** — `home-es.md` and `posts/es/index.json` (+ translated posts)
2. **Link translations** — In each post's `index.json`, use `i18nSlugs` to map each translated language to its slug:
   ```json
   { "slug": "my-post", "i18nSlugs": { "fr": "mon-article", "es": "mi-articulo" } }
   ```
3. **Register the language** in your Quarkdown config (`index.html`):
   ```javascript
   languages: ['en', 'fr', 'es'],
   translations: {
       // ...existing...
       es: {
           nav: { home: 'Inicio', blog: 'Blog' },
           blog: { title: 'Blog', noPosts: 'No hay artículos.', readMore: 'Leer más' },
           pagination: { previous: 'Anterior', next: 'Siguiente' },
           date: { locale: 'es-ES' },
       },
   },
   ```
4. **Update `quarkdown.json`** — add `"es"` to the `languages` array
5. **Rebuild OG pages** — `node build-og.js` (or let the pre-commit hook handle it)

The pre-commit hook detects languages automatically from `posts/*/index.json`, so no hook update is needed.

## Theming

Override CSS custom properties to customize the look:

```css
:root {
  --qd-bg: #0a0a0a;
  --qd-text: #e0e0e0;
  --qd-accent: #00ff88;
  --qd-heading: #ffffff;
  --qd-muted: #666;
  --qd-border: #1a1a1a;
  --qd-code-bg: #050505;
  --qd-font: 'Inter', sans-serif;
  --qd-font-mono: 'Fira Code', monospace;
  --qd-max-width: 800px;
}
```

## Open Graph Builder

Generate static HTML files with proper OG meta tags for social sharing on GitHub Pages:

```bash
node build-og.js
```

## RSS Feed Builder

Generate RSS 2.0 feeds for each language from your posts index:

```bash
node build-rss.js
```

## Sitemap Builder

Generate a single `sitemap.xml` with all URLs (home, blog, posts, tag pages) for all languages:

```bash
node build-sitemap.js
```

Add a sitemap link to your `index.html` `<head>`:

```html
<link rel="sitemap" type="application/xml" href="/sitemap.xml" />
```

Both OG and RSS scripts read their configuration from `quarkdown.json`. This generates `{lang}/feed.xml` for each language (e.g. `en/feed.xml`, `fr/feed.xml`).

`siteName` and `siteDescription` support per-language values:

```json
{
  "siteName": { "en": "My Blog", "fr": "Mon Blog" },
  "siteDescription": { "en": "A personal blog", "fr": "Un blog personnel" }
}
```

### Add RSS link to your HTML

Add these links in your `index.html` `<head>` section:

```html
<link rel="alternate" type="application/rss+xml" title="Blog RSS (EN)" href="/en/feed.xml" />
<link rel="alternate" type="application/rss+xml" title="Blog RSS (FR)" href="/fr/feed.xml" />
```

## Git Hook (recommended)

A pre-commit hook is provided to automatically rebuild OG pages and RSS feeds before each commit:

```bash
cp hooks/pre-commit .git/hooks/pre-commit
```

This ensures OG pages, RSS feeds, and sitemap always stay in sync with your post index.

`build-og.js`, `build-rss.js`, and `build-sitemap.js` are included in the template and copied during setup.

## Docker

A public Docker image is available for those who prefer containerized deployment.

### Quick Start (demo)

```bash
docker run -d -p 8080:80 ghcr.io/darwinonline/quarkdown:latest
```

Then open http://localhost:8080

### With Your Own Content

Mount your site folder — the Quarkdown engine (`src/`, `themes/`) is injected automatically:

```bash
docker run -d -p 8080:80 \
  -v $(pwd)/my-site:/usr/share/nginx/html:ro \
  ghcr.io/darwinonline/quarkdown:latest
```

Your `my-site/` folder should contain:
```
my-site/
├── index.html       # Your Quarkdown config
├── 404.html
├── home-en.md       # Home page(s)
└── posts/           # Your articles
    └── en/
        ├── index.json
        └── *.md
```

### Docker Compose

```bash
curl -O https://raw.githubusercontent.com/DarwinOnLine/quarkdown/main/docker/docker-compose.yml
# Edit the volume path, then:
docker compose up -d
```

## Analytics

Quarkdown includes built-in, provider-agnostic analytics with automatic SPA page view tracking. Page views are tracked on every route change.

Add the `analytics` object to your Quarkdown config:

### Umami

Open source, privacy-friendly, GDPR-compliant. Free cloud tier or self-hostable.

```javascript
analytics: {
  provider: 'umami',
  websiteId: 'your-website-id',
  // src: 'https://your-instance.com/script.js',  // optional, defaults to Umami Cloud
}
```

### Plausible

Lightweight (~1KB), no cookies, GDPR-friendly. Open source, self-hostable.

```javascript
analytics: {
  provider: 'plausible',
  domain: 'yourdomain.com',
  // src: 'https://your-instance.com/js/script.js',  // optional, defaults to Plausible Cloud
}
```

### Fathom

Privacy-first, no cookies, GDPR-compliant without cookie banner.

```javascript
analytics: {
  provider: 'fathom',
  siteId: 'YOUR_SITE_ID',
}
```

### Fairlytics

Free, open source, no cookies, GDPR-compliant, hosted in France. SPA navigation is tracked automatically via MutationObserver.

> **Note:** Fairlytics is a small niche project — fewer integrations, no event/goal tracking, and a smaller community compared to Plausible or Umami. Best suited for simple page view analytics on personal sites or blogs.

```javascript
analytics: {
  provider: 'fairlytics',
  siteKey: 'your-site-key',
}
```

### Google Analytics 4

```javascript
analytics: {
  provider: 'gtag',
  measurementId: 'G-XXXXXXXXXX',
}
```

### Custom Provider

Bring your own tracking function:

```javascript
analytics: {
  provider: 'custom',
  trackPageView: (url) => {
    // your tracking logic here
  },
}
```

### Disabling Analytics

Remove the `analytics` key from your config, or don't include it.

## Architecture

| Module | Role |
|--------|------|
| `quarkdown.js` | Main orchestrator |
| `router.js` | SPA routing (History API) |
| `i18n.js` | Internationalization |
| `content.js` | Markdown loading, parsing, code highlighting |
| `blog.js` | Post index, pagination |
| `meta.js` | OG/Twitter meta tag management |
| `analytics.js` | Provider-agnostic page view tracking |
| `effects.js` | Cursor dot, starfield 404 |
| `search.js` | Client-side search engine |
| `og-builder.js` | Static OG page generator (Node.js) |
| `rss-builder.js` | RSS 2.0 feed generator (Node.js) |
| `sitemap-builder.js` | Sitemap XML generator (Node.js) |

## License

MIT
