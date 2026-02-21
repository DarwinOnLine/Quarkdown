// Client-side search engine for blog posts

export class SearchEngine {
  constructor() {
    this.entries = [];
  }

  /** Index posts for searching */
  index(posts) {
    this.entries = posts.map(post => ({
      slug: post.slug,
      title: post.title,
      description: post.description || '',
      tags: (post.tags || []).join(' '),
      date: post.date,
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

      for (const term of terms) {
        if (title.includes(term)) score += 3;
        if (tags.includes(term)) score += 2;
        if (desc.includes(term)) score += 1;
      }

      if (score > 0) {
        results.push({ ...entry, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
