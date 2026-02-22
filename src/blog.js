// Blog engine: post index, listing, pagination

export class BlogEngine {
  constructor({ postsPerPage = 10, postsDir = 'posts' } = {}) {
    this.postsPerPage = postsPerPage;
    this.postsDir = postsDir;
    this.posts = [];
  }

  /** Load posts index for a given language */
  async loadIndex(lang, contentLoader) {
    try {
      this.posts = await contentLoader.fetchJSON(`${this.postsDir}/${lang}/index.json`);
    } catch (error) {
      console.error('Quarkdown: Failed to load posts index:', error);
      this.posts = [];
    }
    return this.posts;
  }

  /** Get sorted posts (newest first) */
  sorted() {
    return [...this.posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /** Get paginated posts */
  paginate(page = 1) {
    const sorted = this.sorted();
    const totalPages = Math.max(1, Math.ceil(sorted.length / this.postsPerPage));
    page = Math.max(1, Math.min(page, totalPages));
    const startIndex = (page - 1) * this.postsPerPage;
    const items = sorted.slice(startIndex, startIndex + this.postsPerPage);

    return { items, page, totalPages, startIndex, totalPosts: sorted.length };
  }

  /** Find a post by slug */
  findBySlug(slug) {
    return this.posts.find(p => p.slug === slug) || null;
  }

  /** Load post Markdown content */
  async loadPost(slug, lang, contentLoader) {
    return contentLoader.fetchMarkdown(`${this.postsDir}/${lang}/${slug}.md`);
  }

  /** Estimate reading time in minutes from raw text */
  static estimateReadingTime(text) {
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 200));
  }

  /** Get all unique tags across posts */
  allTags() {
    const tags = new Set();
    this.posts.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
    return [...tags].sort();
  }

  /** Get post count per tag */
  tagCounts() {
    const counts = {};
    this.posts.forEach(p => (p.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return counts;
  }

  /** Filter posts by tag */
  filterByTag(tag) {
    return this.sorted().filter(p => (p.tags || []).includes(tag));
  }

  /** Get paginated posts for a specific tag */
  paginateByTag(tag, page = 1) {
    const filtered = this.filterByTag(tag);
    const totalPages = Math.max(1, Math.ceil(filtered.length / this.postsPerPage));
    page = Math.max(1, Math.min(page, totalPages));
    const startIndex = (page - 1) * this.postsPerPage;
    const items = filtered.slice(startIndex, startIndex + this.postsPerPage);
    return { items, page, totalPages, startIndex, totalPosts: filtered.length };
  }

  /** Generate pagination data (page numbers with ellipsis) */
  paginationRange(currentPage, totalPages) {
    if (totalPages <= 1) return [];

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 2 && i <= currentPage + 2)
      ) {
        pages.push({ type: 'page', number: i, active: i === currentPage });
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pages.push({ type: 'ellipsis' });
      }
    }
    return pages;
  }
}
