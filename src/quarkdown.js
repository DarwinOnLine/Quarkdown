// Quarkdown - Zero-dependency Markdown SPA blog engine
// https://github.com/DarwinOnLine/quarkdown

import { Router } from './router.js';
import { I18n } from './i18n.js';
import { ContentLoader } from './content.js';
import { BlogEngine } from './blog.js';
import { MetaManager } from './meta.js';
import { initCursorDot, initStarfield } from './effects.js';

export class Quarkdown {
  /**
   * @param {Object} config
   * @param {string} config.siteName - Site name (used in meta tags & titles)
   * @param {string} config.baseUrl - Absolute base URL for OG tags
   * @param {string[]} [config.languages] - Supported language codes (default: ['en'])
   * @param {string} [config.defaultLanguage] - Fallback language (default: 'en')
   * @param {Object} [config.translations] - Translation dictionary keyed by lang
   * @param {string} [config.contentContainer] - Selector for content div (default: '#content')
   * @param {string} [config.postsDir] - Posts directory (default: 'posts')
   * @param {string} [config.homeFile] - Home markdown pattern, {lang} is replaced (default: 'home-{lang}.md')
   * @param {number} [config.postsPerPage] - Posts per page (default: 10)
   * @param {string} [config.defaultImage] - Default OG image path relative to baseUrl
   * @param {boolean} [config.cursorDot] - Enable cursor dot effect (default: false)
   * @param {boolean} [config.starfield404] - Enable starfield 404 page (default: true)
   * @param {string} [config.feedFileName] - RSS feed file name (e.g. 'feed.xml'), null to disable
   * @param {boolean} [config.externalLinksNewTab] - Open external links in new tab (default: true)
   * @param {Function} [config.renderHome] - Custom home page renderer (html, ctx) => string
   * @param {Function} [config.renderBlog] - Custom blog listing renderer (data, ctx) => string
   * @param {Function} [config.renderPost] - Custom post renderer (html, post, ctx) => string
   * @param {Function} [config.render404] - Custom 404 renderer (ctx) => string
   * @param {Function} [config.renderNav] - Custom nav renderer (ctx) => string
   * @param {Function} [config.renderLoading] - Custom loading renderer () => string
   */
  constructor(config) {
    this.config = {
      languages: ['en'],
      defaultLanguage: 'en',
      translations: {},
      contentContainer: '#content',
      postsDir: 'posts',
      homeFile: 'home-{lang}.md',
      postsPerPage: 10,
      defaultImage: '',
      cursorDot: false,
      starfield404: true,
      feedFileName: null,
      externalLinksNewTab: true,
      ...config,
    };

    this.container = document.querySelector(this.config.contentContainer);
    this.i18n = new I18n({
      languages: this.config.languages,
      defaultLanguage: this.config.defaultLanguage,
      translations: this.config.translations,
    });
    this.content = new ContentLoader();
    this.blog = new BlogEngine({
      postsPerPage: this.config.postsPerPage,
      postsDir: this.config.postsDir,
    });
    this.meta = new MetaManager({
      siteName: this.config.siteName,
      baseUrl: this.config.baseUrl,
      defaultImage: this.config.defaultImage,
    });
    this.router = new Router({
      languages: this.config.languages,
      onRoute: (route) => this._handleRoute(route),
    });

    if (this.config.cursorDot) initCursorDot();

    // Expose instance globally for onclick handlers in templates
    window._quarkdown = this;
  }

  /** Start the app */
  async start() {
    // Detect initial language from URL
    const path = window.location.pathname || '/';
    const langPattern = new RegExp(`^\\/(${this.config.languages.join('|')})(?=\\/|$)`);
    const langMatch = path.match(langPattern);
    this.i18n.resolve(langMatch?.[1] || null);

    await this.blog.loadIndex(this.i18n.currentLang, this.content);
    this.router.start();
  }

  /** Shorthand for translation */
  t(key) {
    return this.i18n.t(key);
  }

  /** Navigate programmatically */
  navigateTo(path) {
    this.router.navigateTo(path);
  }

  /** Format a date string using current locale */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString(this.t('date.locale') || this.i18n.currentLang, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /** Build language switcher HTML */
  languageSwitcher(i18nSlugs = null) {
    const lang = this.i18n.currentLang;
    const currentPath = window.location.pathname.replace(new RegExp(`^\\/(${this.config.languages.join('|')})`), '') || '/';

    return this.config.languages.map(l => {
      let targetPath;
      if (i18nSlugs && i18nSlugs[l]) {
        targetPath = `/${l}/blog/${i18nSlugs[l]}`;
      } else {
        targetPath = `/${l}${currentPath}`;
      }
      return `<button class="lang-btn ${l === lang ? 'active' : ''}"
                onclick="window._quarkdown.navigateTo('${targetPath}')">${l.toUpperCase()}</button>`;
    }).join('');
  }

  // --- Private ---

  async _handleRoute({ path, lang, params, routeId }) {
    // Language change
    if (lang && lang !== this.i18n.currentLang) {
      this.i18n.currentLang = lang;
      this._showLoading();
      await this.blog.loadIndex(lang, this.content);
      if (!this.router.isActive(routeId)) return;
    } else if (lang) {
      this.i18n.currentLang = lang;
    }

    if (path === '/' || path === '') {
      await this._showHome(routeId);
    } else if (path === '/blog') {
      const page = parseInt(params.page) || 1;
      this._showBlog(page);
    } else if (path.startsWith('/blog/')) {
      const slug = path.split('/blog/')[1].replace(/\/$/, '');
      await this._showPost(slug, routeId);
    } else {
      this._show404();
    }
  }

  _showLoading() {
    const custom = this.config.renderLoading;
    this.container.innerHTML = custom ? custom() : `
      <div class="loading-page">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      </div>
    `;
  }

  _ctx() {
    const lang = this.i18n.currentLang;
    const feedUrl = this.config.feedFileName ? `/${lang}/${this.config.feedFileName}` : null;
    return {
      lang,
      t: (key) => this.t(key),
      nav: (i18nSlugs) => this.languageSwitcher(i18nSlugs),
      formatDate: (d) => this.formatDate(d),
      navigateTo: (p) => this.navigateTo(p),
      siteName: this.config.siteName,
      feedUrl,
    };
  }

  async _showHome(routeId) {
    this._showLoading();
    try {
      const file = this.config.homeFile.replace('{lang}', this.i18n.currentLang);
      const markdown = await this.content.fetchMarkdown(file);
      if (!this.router.isActive(routeId)) return;

      const html = this.content.parseMarkdown(markdown);
      const ctx = this._ctx();

      if (this.config.renderHome) {
        this.container.innerHTML = this.config.renderHome(html, ctx);
      } else {
        this.container.innerHTML = `
          <div class="home-page">
            <nav class="main-nav">
              <div class="lang-switcher">${ctx.nav()}</div>
              <a href="/${ctx.lang}/blog">${ctx.t('nav.blog')}</a>
            </nav>
            <div class="home-content">${html}</div>
          </div>
        `;
      }
      this.content.highlightCode(this.container);
      this.content.addHeadingAnchors(this.container);
      this.content.scrollToHash();
      if (this.config.externalLinksNewTab) this.content.openExternalLinks(this.container);
      this.meta.update();
    } catch (error) {
      console.error('Quarkdown: Failed to load home page:', error);
      this.container.innerHTML = '<div class="home-page"><p>Failed to load content.</p></div>';
    }
  }

  _showBlog(page = 1) {
    const { items, totalPages, startIndex } = this.blog.paginate(page);
    const ctx = this._ctx();
    const paginationRange = this.blog.paginationRange(page, totalPages);

    if (this.config.renderBlog) {
      this.container.innerHTML = this.config.renderBlog({ items, page, totalPages, startIndex, paginationRange }, ctx);
    } else {
      const postsHTML = items.map((post, index) => {
        const num = String(startIndex + index + 1).padStart(2, '0');
        const tagsHTML = (post.tags || []).map(tag => `<span class="post-tag">${tag}</span>`).join('');
        return `
          <article class="post-preview" onclick="event.preventDefault(); window._quarkdown.navigateTo('/${ctx.lang}/blog/${post.slug}')" style="cursor:pointer;">
            <div class="post-number">${num}</div>
            <h2>${post.title}</h2>
            <p class="post-meta">${ctx.formatDate(post.date)}</p>
            <p class="post-description">${post.description}</p>
            ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
          </article>
        `;
      }).join('');

      let paginationHTML = '';
      if (totalPages > 1) {
        const prevDisabled = page <= 1;
        const nextDisabled = page >= totalPages;
        paginationHTML = `<nav class="pagination">
          ${prevDisabled
            ? `<span class="page-link disabled">&laquo; ${ctx.t('pagination.previous')}</span>`
            : `<a href="/${ctx.lang}/blog?page=${page - 1}" class="page-link">&laquo; ${ctx.t('pagination.previous')}</a>`}
          ${paginationRange.map(p =>
            p.type === 'ellipsis'
              ? '<span class="page-link dots">...</span>'
              : p.active
                ? `<span class="page-link active">${p.number}</span>`
                : `<a href="/${ctx.lang}/blog?page=${p.number}" class="page-link">${p.number}</a>`
          ).join('')}
          ${nextDisabled
            ? `<span class="page-link disabled">${ctx.t('pagination.next')} &raquo;</span>`
            : `<a href="/${ctx.lang}/blog?page=${page + 1}" class="page-link">${ctx.t('pagination.next')} &raquo;</a>`}
        </nav>`;
      }

      const rssLink = ctx.feedUrl
        ? `<a href="${ctx.feedUrl}" class="rss-link" title="RSS Feed" target="_blank" rel="noopener">
            <svg class="rss-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="6.18" cy="17.82" r="2.18"/><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/></svg>
           </a>`
        : '';

      this.container.innerHTML = `
        <div class="blog-page">
          <nav class="main-nav">
            <div class="lang-switcher">${ctx.nav()}</div>
            <a href="/${ctx.lang}">${ctx.t('nav.home')}</a>
          </nav>
          <div class="blog-header">
            <h1>${ctx.t('blog.title')}<span class="dot">.</span></h1>
            ${rssLink}
          </div>
          <div class="posts-list">
            ${postsHTML || `<p>${ctx.t('blog.noPosts')}</p>`}
          </div>
          ${paginationHTML}
        </div>
      `;
    }
    this.meta.update();
  }

  async _showPost(slug, routeId) {
    const post = this.blog.findBySlug(slug);
    if (!post) { this._show404(); return; }

    this._showLoading();
    try {
      const markdown = await this.blog.loadPost(slug, this.i18n.currentLang, this.content);
      if (!this.router.isActive(routeId)) return;

      const html = this.content.parseMarkdown(markdown);
      const ctx = this._ctx();

      if (this.config.renderPost) {
        this.container.innerHTML = this.config.renderPost(html, post, ctx);
      } else {
        this.container.innerHTML = `
          <div class="post-page">
            <nav class="main-nav">
              ${post.i18nSlugs ? `<div class="lang-switcher">${ctx.nav(post.i18nSlugs)}</div>` : ''}
              <a href="/${ctx.lang}">${ctx.t('nav.home')}</a>
              <a href="/${ctx.lang}/blog">${ctx.t('nav.blog')}</a>
            </nav>
            <article>
              <div class="post-meta">${ctx.formatDate(post.date)}</div>
              <div class="post-content">${html}</div>
            </article>
          </div>
        `;
      }
      this.content.highlightCode(this.container);
      this.content.addHeadingAnchors(this.container);
      this.content.scrollToHash();
      if (this.config.externalLinksNewTab) this.content.openExternalLinks(this.container);
      this.content.executeScripts(this.container);
      this.meta.update(post);
    } catch (error) {
      console.error('Quarkdown: Failed to load post:', error);
      this._show404();
    }
  }

  _show404() {
    const ctx = this._ctx();

    if (this.config.render404) {
      this.container.innerHTML = this.config.render404(ctx);
      return;
    }

    if (this.config.starfield404) {
      this.container.innerHTML = `
        <div class="error-404-page">
          <canvas id="space-404"></canvas>
          <div class="content-404">
            <p class="lost-text-404">Lost<span class="dot">?</span></p>
            <p class="lost-code-404">error 404 — page not found</p>
            <span id="warp-404">Back home</span>
          </div>
        </div>
      `;
      document.body.style.overflow = 'hidden';

      setTimeout(() => {
        const canvas = document.getElementById('space-404');
        const triggerWarp = initStarfield(canvas, { router: this.router });

        const warpBtn = document.getElementById('warp-404');
        if (warpBtn && triggerWarp) {
          let warping = false;
          warpBtn.addEventListener('click', () => {
            if (warping) return;
            warping = true;
            const content404 = document.querySelector('.content-404');
            if (content404) {
              content404.style.transition = 'opacity 0.4s';
              content404.style.opacity = '0';
            }
            triggerWarp(() => {
              warping = false;
              this.navigateTo(`/${this.i18n.currentLang}`);
            });
          });
        }
      }, 100);
    } else {
      this.container.innerHTML = `
        <div class="error-404-page" style="text-align:center;padding:4rem;">
          <h1>404</h1>
          <p>Page not found</p>
          <a href="/${ctx.lang}">Back home</a>
        </div>
      `;
    }
  }
}

export { Router } from './router.js';
export { I18n } from './i18n.js';
export { ContentLoader } from './content.js';
export { BlogEngine } from './blog.js';
export { MetaManager } from './meta.js';
export { initCursorDot, initStarfield } from './effects.js';
