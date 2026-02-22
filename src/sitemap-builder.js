#!/usr/bin/env node

// Sitemap XML builder for Quarkdown
// Generates a single sitemap.xml with all URLs across all languages
//
// Usage: node sitemap-builder.js --config quarkdown.json
// Or import and use programmatically

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toW3CDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  return dateStr; // Already YYYY-MM-DD
}

/**
 * @param {Object} config
 * @param {string} config.baseUrl - Absolute URL (e.g. https://example.github.io)
 * @param {string[]} config.languages - Language codes
 * @param {string} config.postsDir - Posts directory relative to rootDir
 * @param {string} config.rootDir - Root directory for reading/writing
 * @param {string} [config.sitemapFileName] - Output file name (default: 'sitemap.xml')
 */
export function buildSitemap(config) {
  const {
    baseUrl,
    languages,
    postsDir = 'posts',
    rootDir,
    sitemapFileName = 'sitemap.xml',
  } = config;

  const today = new Date().toISOString().split('T')[0];
  const urls = [];

  for (const lang of languages) {
    // Home page
    urls.push({ loc: `${baseUrl}/${lang}`, lastmod: today, priority: '1.0' });

    // Posts
    const indexPath = join(rootDir, postsDir, lang, 'index.json');
    const posts = JSON.parse(readFileSync(indexPath, 'utf-8'));

    // Most recent post date for blog listing lastmod
    const latestDate = posts.reduce((max, p) => p.date > max ? p.date : max, '');

    // Blog listing
    urls.push({ loc: `${baseUrl}/${lang}/blog`, lastmod: toW3CDate(latestDate), priority: '0.8' });

    // Collect tags with their most recent post date
    const tagLastmod = {};

    for (const post of posts) {
      urls.push({
        loc: `${baseUrl}/${lang}/blog/${post.slug}`,
        lastmod: toW3CDate(post.date),
        priority: '0.6',
      });
      (post.tags || []).forEach(tag => {
        if (!tagLastmod[tag] || post.date > tagLastmod[tag]) tagLastmod[tag] = post.date;
      });
    }

    // Tag pages
    for (const [tag, lastmod] of Object.entries(tagLastmod)) {
      urls.push({
        loc: `${baseUrl}/${lang}/blog/tag/${encodeURIComponent(tag)}`,
        lastmod: toW3CDate(lastmod),
        priority: '0.5',
      });
    }
  }

  const urlEntries = urls.map(u => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  const outPath = join(rootDir, sitemapFileName);
  writeFileSync(outPath, xml, 'utf-8');
  console.log(`  Generated: ${outPath}`);
  console.log('\nSitemap built successfully.');
}

// CLI mode
const args = process.argv.slice(2);
if (args.includes('--config')) {
  const configPath = args[args.indexOf('--config') + 1];
  if (!configPath) {
    console.error('Usage: node sitemap-builder.js --config <path-to-config.json>');
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.rootDir) config.rootDir = dirname(configPath);
  buildSitemap(config);
}
