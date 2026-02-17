# Quarkdown

Zero-dependency Markdown SPA blog engine for GitHub Pages.

**Quarkdown** turns a folder of Markdown files into a fully-featured single-page blog — no build step, no bundler, no framework. Just HTML, JS, and your words.

## Features

- **SPA routing** — History API with async race-condition protection
- **Markdown rendering** — via [marked.js](https://marked.js.org/) (CDN)
- **Syntax highlighting** — via [highlight.js](https://highlightjs.org/) with optional line numbers
- **i18n** — multi-language support with auto-detection and language switcher
- **Blog engine** — post index, pagination with ellipsis, tags
- **Open Graph builder** — static OG meta pages for GitHub Pages social sharing
- **Embedded scripts** — execute `<script>` tags inside Markdown posts
- **Starfield 404** — interactive canvas animation with warp speed effect
- **Cursor dot** — decorative mouse-following dot (optional)
- **Theming** — CSS custom properties for easy customization
- **Zero build step** — works directly from a static file server

## Prerequisites

- **Python 3** — required to run the local dev server (`server.py`)
- **Node.js** — only needed if you use the Open Graph builder (`og-builder.js`)

## Quick Start

```bash
# Clone the repo
git clone https://github.com/DarwinOnLine/quarkdown.git my-blog
cd my-blog

# Copy the template as your site root
cp -r template/* .

# Start the dev server (default: port 8000)
python3 server.py
# → http://localhost:8000

# Or specify a custom port
python3 server.py 3000
# → http://localhost:3000
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

  // Meta
  defaultImage: 'assets/images/default-og.png',

  // i18n
  translations: {
    en: {
      nav: { home: 'Home', blog: 'Blog' },
      blog: { title: 'Blog', noPosts: 'No posts yet.' },
      pagination: { previous: 'Previous', next: 'Next' },
      date: { locale: 'en-US' },
    },
    fr: {
      nav: { home: 'Accueil', blog: 'Blog' },
      blog: { title: 'Blog', noPosts: 'Aucun article.' },
      pagination: { previous: 'Précédent', next: 'Suivant' },
      date: { locale: 'fr-FR' },
    },
  },

  // Custom renderers (optional)
  renderHome: (html, ctx) => `<div>...</div>`,
  renderBlog: (data, ctx) => `<div>...</div>`,
  renderPost: (html, post, ctx) => `<div>...</div>`,
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
    "i18nSlug": "mon-premier-article"
  }
]
```

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
node src/og-builder.js --config quarkdown.og.json
```

## Architecture

| Module | Role |
|--------|------|
| `quarkdown.js` | Main orchestrator |
| `router.js` | SPA routing (History API) |
| `i18n.js` | Internationalization |
| `content.js` | Markdown loading, parsing, code highlighting |
| `blog.js` | Post index, pagination |
| `meta.js` | OG/Twitter meta tag management |
| `effects.js` | Cursor dot, starfield 404 |
| `og-builder.js` | Static OG page generator (Node.js) |

## License

MIT
