#!/usr/bin/env node

// RSS feed builder for Quarkdown
// Generates RSS 2.0 feeds for each language from posts index
//
// Usage: node rss-builder.js --config quarkdown.og.json
// Or import and use programmatically

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRFC822(dateStr) {
  // Convert YYYY-MM-DD to RFC 822 format
  const date = new Date(dateStr + 'T12:00:00Z');
  return date.toUTCString();
}

/**
 * @param {Object} config
 * @param {string} config.baseUrl - Absolute URL (e.g. https://example.github.io)
 * @param {string} config.siteName - Site name
 * @param {string} config.siteDescription - Site description (optional, defaults to siteName)
 * @param {string[]} config.languages - Language codes
 * @param {string} config.postsDir - Posts directory relative to rootDir
 * @param {string} config.defaultImage - Default image relative to baseUrl
 * @param {string} config.rootDir - Root directory for reading/writing
 * @param {string} [config.feedFileName] - Feed file name (default: 'feed.xml')
 * @param {number} [config.maxItems] - Max items in feed (default: 20)
 */
export function buildRSSFeeds(config) {
  const {
    baseUrl,
    siteName,
    siteDescription = siteName,
    languages,
    postsDir = 'posts',
    defaultImage = '',
    rootDir,
    feedFileName = 'feed.xml',
    maxItems = 20,
  } = config;

  const defaultImg = defaultImage ? `${baseUrl}/${defaultImage}` : '';
  const buildDate = new Date().toUTCString();

  function generateRSS(lang, posts) {
    const channelUrl = `${baseUrl}/${lang}`;
    const feedUrl = `${baseUrl}/${lang}/${feedFileName}`;

    // Sort by date descending and limit
    const sortedPosts = [...posts]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, maxItems);

    const items = sortedPosts.map(post => {
      const postUrl = `${baseUrl}/${lang}/blog/${post.slug}`;
      const imageUrl = post.image ? `${baseUrl}/${post.image}` : defaultImg;

      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${toRFC822(post.date)}</pubDate>
      <description>${escapeXml(post.description)}</description>${post.tags && post.tags.length > 0 ? post.tags.map(tag => `
      <category>${escapeXml(tag)}</category>`).join('') : ''}${imageUrl ? `
      <enclosure url="${imageUrl}" type="image/jpeg" length="0" />` : ''}
    </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${channelUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>${lang}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${defaultImg ? `    <image>
      <url>${defaultImg}</url>
      <title>${escapeXml(siteName)}</title>
      <link>${channelUrl}</link>
    </image>` : ''}
${items}
  </channel>
</rss>`;
  }

  function writeRSSFile(filePath, content) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf-8');
    console.log(`  Generated: ${filePath}`);
  }

  for (const lang of languages) {
    const indexPath = join(rootDir, postsDir, lang, 'index.json');
    const posts = JSON.parse(readFileSync(indexPath, 'utf-8'));

    writeRSSFile(
      join(rootDir, lang, feedFileName),
      generateRSS(lang, posts)
    );
  }

  console.log('\nRSS feeds built successfully.');
}

// CLI mode
const args = process.argv.slice(2);
if (args.includes('--config')) {
  const configPath = args[args.indexOf('--config') + 1];
  if (!configPath) {
    console.error('Usage: node rss-builder.js --config <path-to-config.json>');
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, 'utf-8'));
  if (!config.rootDir) config.rootDir = dirname(configPath);
  buildRSSFeeds(config);
}
