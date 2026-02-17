#!/usr/bin/env node

// Open Graph static page builder for GitHub Pages
// Generates index.html files with proper OG meta tags for each route
//
// Usage: node og-builder.js --config quarkdown.og.json
// Or import and use programmatically

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @param {Object} config
 * @param {string} config.baseUrl - Absolute URL (e.g. https://example.github.io)
 * @param {string} config.siteName - Site name
 * @param {string[]} config.languages - Language codes
 * @param {string} config.postsDir - Posts directory relative to rootDir
 * @param {string} config.defaultImage - Default OG image relative to baseUrl
 * @param {string} config.rootDir - Root directory for reading/writing
 * @param {string} [config.stylesheetPath] - CSS path (default: 'styles.css')
 * @param {string} [config.hljsTheme] - Highlight.js theme URL
 * @param {string[]} [config.scripts] - Script tags to include
 */
export function buildOGPages(config) {
  const {
    baseUrl,
    siteName,
    languages,
    postsDir = 'posts',
    defaultImage = '',
    rootDir,
    stylesheetPath = 'styles.css',
    hljsTheme = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
    scripts = [],
  } = config;

  const defaultImg = defaultImage ? `${baseUrl}/${defaultImage}` : '';

  function spaPage({ ogType, title, description, image, url }) {
    const scriptTags = scripts.map(s => `        <script src="${s}"></script>`).join('\n');
    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <base href="/" />
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" type="text/css" media="screen" href="${stylesheetPath}" />
${hljsTheme ? `        <link rel="stylesheet" href="${hljsTheme}">` : ''}
        <title>${escapeHtml(title)}</title>
        <!-- Open Graph -->
        <meta property="og:type" content="${ogType}" />
        <meta property="og:title" content="${escapeHtml(title)}" />
        <meta property="og:description" content="${escapeHtml(description)}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${url}" />
        <!-- Twitter Card -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${escapeHtml(title)}" />
        <meta name="twitter:description" content="${escapeHtml(description)}" />
        <meta name="twitter:image" content="${image}" />
    </head>
    <body>
        <div id="content"></div>
${scriptTags}
    </body>
</html>`;
  }

  function writeOGFile(filePath, content) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  Generated: ${filePath}`);
  }

  for (const lang of languages) {
    const indexPath = join(rootDir, postsDir, lang, 'index.json');
    const posts = JSON.parse(readFileSync(indexPath, 'utf-8'));

    // Lang root
    writeOGFile(join(rootDir, lang, 'index.html'), spaPage({
      ogType: 'website',
      title: siteName,
      description: siteName,
      image: defaultImg,
      url: `${baseUrl}/${lang}`,
    }));

    // Blog listing
    writeOGFile(join(rootDir, lang, 'blog', 'index.html'), spaPage({
      ogType: 'website',
      title: `Blog - ${siteName}`,
      description: 'Blog',
      image: defaultImg,
      url: `${baseUrl}/${lang}/blog`,
    }));

    // Article pages
    for (const post of posts) {
      writeOGFile(
        join(rootDir, lang, 'blog', post.slug, 'index.html'),
        spaPage({
          ogType: 'article',
          title: `${post.title} - ${siteName}`,
          description: post.description,
          image: post.image ? `${baseUrl}/${post.image}` : defaultImg,
          url: `${baseUrl}/${lang}/blog/${post.slug}`,
        })
      );
    }
  }

  console.log('\nOG pages built successfully.');
}

// CLI mode
const args = process.argv.slice(2);
if (args.includes('--config')) {
  const configPath = args[args.indexOf('--config') + 1];
  if (!configPath) {
    console.error('Usage: node og-builder.js --config <path-to-config.json>');
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.rootDir) config.rootDir = dirname(configPath);
  buildOGPages(config);
}
