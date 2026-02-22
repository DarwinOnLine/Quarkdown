// Client-side search engine for blog posts

export class SearchEngine {
  constructor() {
    this.entries = [];
  }

  /** Strip Markdown syntax to extract plain text */
  static stripMarkdown(md) {
    return md
      .replace(/^#{1,6}\s+/gm, '')       // headings
      .replace(/!\[.*?\]\(.*?\)/g, '')    // images
      .replace(/\[([^\]]*)\]\(.*?\)/g, '$1') // links → text
      .replace(/(`{1,3})[^`]*?\1/g, '')  // inline code
      .replace(/^```[\s\S]*?^```/gm, '') // code blocks
      .replace(/[*_~]{1,3}/g, '')         // bold/italic/strikethrough
      .replace(/^[>\-\+\*]\s+/gm, '')    // blockquotes/lists
      .replace(/\|/g, '')                 // tables
      .replace(/\n{2,}/g, ' ')
      .trim();
  }

  /** Index posts for searching (with optional content) */
  index(posts, contents = {}) {
    this.entries = posts.map(post => ({
      slug: post.slug,
      title: post.title,
      description: post.description || '',
      tags: (post.tags || []).join(' '),
      date: post.date,
      content: contents[post.slug] ? SearchEngine.stripMarkdown(contents[post.slug]) : '',
    }));
  }

  /** Search posts by query, returns scored results */
  search(query) {
    if (!query || !query.trim()) return [];

    const terms = query.toLowerCase().trim().split(/\s+/);
    const results = [];

    for (const entry of this.entries) {
      let score = 0;
      const title = entry.title.toLowerCase();
      const desc = entry.description.toLowerCase();
      const tags = entry.tags.toLowerCase();
      const content = entry.content.toLowerCase();

      for (const term of terms) {
        if (title.includes(term)) score += 3;
        if (tags.includes(term)) score += 2;
        if (desc.includes(term)) score += 1;
        if (content.includes(term)) score += 0.5;
      }

      if (score > 0) {
        results.push({ ...entry, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
