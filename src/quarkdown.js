// Quarkdown - Zero-dependency Markdown SPA blog engine
// https://github.com/DarwinOnLine/quarkdown

import { Router } from './router.js';
import { I18n } from './i18n.js';
import { ContentLoader } from './content.js';
import { BlogEngine } from './blog.js';
import { MetaManager } from './meta.js';
import { initCursorDot, initStarfield } from './effects.js';
import { Analytics } from './analytics.js';
import { SearchEngine } from './search.js';

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
   * @param {Object} [config.analytics] - Analytics provider config (see Analytics class)
   * @param {boolean} [config.toc] - Enable table of contents on posts (default: true)
   * @param {boolean} [config.search] - Enable client-side search (default: true)
   * @param {boolean} [config.themeToggle] - Enable light/dark theme toggle (default: false)
   * @param {Function} [config.renderTag] - Custom tag page renderer (data, tag, ctx) => string
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
      toc: true,
      search: true,
      themeToggle: false,
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

    this.analytics = this.config.analytics ? new Analytics(this.config.analytics) : null;
    this.search = this.config.search ? new SearchEngine() : null;

    if (this.config.cursorDot) initCursorDot();
    if (this.config.themeToggle) this._initThemeToggle();

    // Global keyboard shortcut: Ctrl+K / Cmd+K to open search
    if (this.config.search) {
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          if (document.querySelector('.search-overlay')) {
            this._closeSearch();
          } else {
            this._openSearch();
          }
        }
      });
    }

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
    if (this.search) this.search.index(this.blog.posts);
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
    if (this.analytics) {
      this.analytics.trackPageView(window.location.pathname);
    }

    // Close search overlay and TOC sidebar on navigation
    this._closeSearch();
    this._closeTOC();

    // Language change
    if (lang && lang !== this.i18n.currentLang) {
      this.i18n.currentLang = lang;
      this._showLoading();
      await this.blog.loadIndex(lang, this.content);
      if (this.search) this.search.index(this.blog.posts);
      if (!this.router.isActive(routeId)) return;
    } else if (lang) {
      this.i18n.currentLang = lang;
    }

    if (path === '/' || path === '') {
      await this._showHome(routeId);
    } else if (path === '/blog') {
      const page = parseInt(params.page) || 1;
      this._showBlog(page);
    } else if (path.match(/^\/blog\/tag\/(.+)/)) {
      const tag = decodeURIComponent(path.match(/^\/blog\/tag\/(.+)/)[1].replace(/\/$/, ''));
      const page = parseInt(params.page) || 1;
      this._showTag(tag, page);
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
      this.content.lazyLoadImages(this.container);
      this.content.scrollToHash();
      if (this.config.externalLinksNewTab) this.content.openExternalLinks(this.container);
      if (this.config.themeToggle) this._injectThemeToggle();
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
        const tagsHTML = (post.tags || []).map(tag =>
          `<a class="post-tag" href="/${ctx.lang}/blog/tag/${encodeURIComponent(tag)}" onclick="event.stopPropagation(); window._quarkdown.navigateTo('/${ctx.lang}/blog/tag/${encodeURIComponent(tag)}'); return false;">${tag}</a>`
        ).join('');
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

      const searchBtn = this.config.search
        ? `<button class="search-btn" onclick="window._quarkdown._openSearch()" title="Search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
           </button>`
        : '';

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
            ${searchBtn}
            ${rssLink}
          </div>
          <div class="posts-list">
            ${postsHTML || `<p>${ctx.t('blog.noPosts')}</p>`}
          </div>
          ${paginationHTML}
        </div>
      `;
    }
    if (this.config.themeToggle) this._injectThemeToggle();
    this.meta.update();
  }

  _showTag(tag, page = 1) {
    const { items, totalPages, startIndex } = this.blog.paginateByTag(tag, page);
    const ctx = this._ctx();
    const paginationRange = this.blog.paginationRange(page, totalPages);
    const encodedTag = encodeURIComponent(tag);

    if (this.config.renderTag) {
      this.container.innerHTML = this.config.renderTag({ items, page, totalPages, startIndex, paginationRange }, tag, ctx);
    } else {
      const postsHTML = items.map((post, index) => {
        const num = String(startIndex + index + 1).padStart(2, '0');
        const tagsHTML = (post.tags || []).map(t =>
          `<a class="post-tag" href="/${ctx.lang}/blog/tag/${encodeURIComponent(t)}" onclick="event.stopPropagation(); window._quarkdown.navigateTo('/${ctx.lang}/blog/tag/${encodeURIComponent(t)}'); return false;">${t}</a>`
        ).join('');
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
            : `<a href="/${ctx.lang}/blog/tag/${encodedTag}?page=${page - 1}" class="page-link">&laquo; ${ctx.t('pagination.previous')}</a>`}
          ${paginationRange.map(p =>
            p.type === 'ellipsis'
              ? '<span class="page-link dots">...</span>'
              : p.active
                ? `<span class="page-link active">${p.number}</span>`
                : `<a href="/${ctx.lang}/blog/tag/${encodedTag}?page=${p.number}" class="page-link">${p.number}</a>`
          ).join('')}
          ${nextDisabled
            ? `<span class="page-link disabled">${ctx.t('pagination.next')} &raquo;</span>`
            : `<a href="/${ctx.lang}/blog/tag/${encodedTag}?page=${page + 1}" class="page-link">${ctx.t('pagination.next')} &raquo;</a>`}
        </nav>`;
      }

      this.container.innerHTML = `
        <div class="blog-page">
          <nav class="main-nav">
            <div class="lang-switcher">${ctx.nav()}</div>
            <a href="/${ctx.lang}">${ctx.t('nav.home')}</a>
            <a href="/${ctx.lang}/blog">${ctx.t('nav.blog')}</a>
          </nav>
          <div class="blog-header">
            <h1>${ctx.t('blog.tagTitle').replace('{tag}', tag)}<span class="dot">.</span></h1>
          </div>
          <div class="posts-list">
            ${postsHTML || `<p>${ctx.t('blog.noPosts')}</p>`}
          </div>
          ${paginationHTML}
        </div>
      `;
    }
    if (this.config.themeToggle) this._injectThemeToggle();
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
      const readingTime = BlogEngine.estimateReadingTime(markdown);
      const readingTimeText = this.t('blog.readingTime').replace('{min}', readingTime);
      const tagsHTML = (post.tags || []).map(tag =>
        `<a class="post-tag" href="/${ctx.lang}/blog/tag/${encodeURIComponent(tag)}" onclick="event.stopPropagation(); window._quarkdown.navigateTo('/${ctx.lang}/blog/tag/${encodeURIComponent(tag)}'); return false;">${tag}</a>`
      ).join('');

      if (this.config.renderPost) {
        this.container.innerHTML = this.config.renderPost(html, post, ctx, { readingTime });
      } else {
        this.container.innerHTML = `
          <div class="post-page">
            <nav class="main-nav">
              ${post.i18nSlugs ? `<div class="lang-switcher">${ctx.nav(post.i18nSlugs)}</div>` : ''}
              <a href="/${ctx.lang}">${ctx.t('nav.home')}</a>
              <a href="/${ctx.lang}/blog">${ctx.t('nav.blog')}</a>
            </nav>
            <article>
              <div class="post-meta">${ctx.formatDate(post.date)} <span class="reading-time">— ${readingTimeText}</span></div>
              ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
              <div class="post-content">${html}</div>
            </article>
          </div>
        `;
      }
      this.content.highlightCode(this.container);
      this.content.addHeadingAnchors(this.container);
      this.content.lazyLoadImages(this.container);

      // TOC — floating sidebar, only with default template
      if (this.config.toc && !this.config.renderPost) {
        const postContent = this.container.querySelector('.post-content');
        if (postContent) {
          const toc = this.content.generateTOC(postContent, this.t('blog.toc'));
          if (toc) this._injectTOC(toc);
        }
      }

      this.content.scrollToHash();
      if (this.config.externalLinksNewTab) this.content.openExternalLinks(this.container);
      this.content.executeScripts(this.container);
      if (this.config.themeToggle) this._injectThemeToggle();
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

  // --- Theme Toggle (system / light / dark) ---

  _initThemeToggle() {
    const saved = localStorage.getItem('qd-theme');
    this._themeMode = saved || 'system';
    this._applyTheme();
    // React to OS changes when in system mode
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (this._themeMode === 'system') this._applyTheme();
    });
  }

  _applyTheme() {
    if (this._themeMode === 'system') {
      const osLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      document.documentElement.setAttribute('data-theme', osLight ? 'light' : 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', this._themeMode);
    }
  }

  toggleTheme() {
    const cycle = { system: 'light', light: 'dark', dark: 'system' };
    this._themeMode = cycle[this._themeMode] || 'system';
    if (this._themeMode === 'system') {
      localStorage.removeItem('qd-theme');
    } else {
      localStorage.setItem('qd-theme', this._themeMode);
    }
    this._applyTheme();
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.innerHTML = this._themeIcon();
  }

  _themeIcon() {
    if (this._themeMode === 'light') return this._moonIcon();   // click will go to dark
    if (this._themeMode === 'dark') return this._systemIcon();   // click will go to system
    return this._sunIcon();                                      // system → click will go to light
  }

  _sunIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  }

  _moonIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  _systemIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  }

  _injectThemeToggle() {
    const nav = this.container.querySelector('.main-nav');
    if (!nav || nav.querySelector('.theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.innerHTML = this._themeIcon();
    btn.onclick = () => this.toggleTheme();
    nav.appendChild(btn);
  }

  // --- TOC Sidebar ---

  _injectTOC(tocNav) {
    // Remove any existing TOC
    this._closeTOC();

    // Desktop: floating sidebar + toggle button
    const sidebar = document.createElement('div');
    sidebar.className = 'toc-sidebar';
    sidebar.appendChild(tocNav);
    document.body.appendChild(sidebar);

    const btn = document.createElement('button');
    btn.className = 'toc-toggle';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="10" y2="18"/></svg>';
    btn.onclick = () => {
      sidebar.classList.toggle('open');
      btn.classList.toggle('active');
    };
    document.body.appendChild(btn);

    // Close sidebar on link click
    sidebar.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        sidebar.classList.remove('open');
        btn.classList.remove('active');
      });
    });

    // Close sidebar on click outside
    this._tocOutsideListener = (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        sidebar.classList.remove('open');
        btn.classList.remove('active');
      }
    };
    document.addEventListener('click', this._tocOutsideListener);

    // Mobile: inline collapsed <details> inside post-content
    const postContent = this.container.querySelector('.post-content');
    if (postContent) {
      const inlineToc = document.createElement('details');
      inlineToc.className = 'toc-inline';
      const label = tocNav.querySelector('.toc-title')?.textContent || 'TOC';
      const listClone = tocNav.querySelector('ul')?.cloneNode(true)?.outerHTML || '';
      inlineToc.innerHTML = `<summary>${label}</summary><nav class="toc-panel">${listClone}</nav>`;
      postContent.insertBefore(inlineToc, postContent.firstChild);
    }

    // Scroll spy: highlight active section in TOC
    this._initScrollSpy(sidebar);
  }

  _initScrollSpy(sidebar) {
    if (this._tocObserver) this._tocObserver.disconnect();

    const links = sidebar.querySelectorAll('.toc-panel a');
    const idToLink = new Map();
    links.forEach(a => {
      const id = a.getAttribute('href')?.replace(/^#/, '');
      if (id) idToLink.set(id, a);
    });

    if (idToLink.size === 0) return;

    const headings = Array.from(idToLink.keys())
      .map(id => document.getElementById(id))
      .filter(Boolean);

    let activeId = null;

    this._tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) activeId = entry.target.id;
      });
      links.forEach(a => a.classList.remove('toc-active'));
      if (activeId && idToLink.has(activeId)) {
        idToLink.get(activeId).classList.add('toc-active');
      }
    }, { rootMargin: '0px 0px -70% 0px', threshold: 0 });

    headings.forEach(h => this._tocObserver.observe(h));
  }

  _closeTOC() {
    if (this._tocObserver) { this._tocObserver.disconnect(); this._tocObserver = null; }
    if (this._tocOutsideListener) { document.removeEventListener('click', this._tocOutsideListener); this._tocOutsideListener = null; }
    document.querySelector('.toc-sidebar')?.remove();
    document.querySelector('.toc-toggle')?.remove();
    document.querySelector('.toc-inline')?.remove();
  }

  // --- Search ---

  _openSearch() {
    if (!this.search || document.querySelector('.search-overlay')) return;
    const ctx = this._ctx();
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-modal">
        <input type="text" class="search-input" placeholder="${this.t('search.placeholder')}" autofocus />
        <div class="search-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.search-input');
    const resultsDiv = overlay.querySelector('.search-results');

    input.addEventListener('input', () => {
      const results = this.search.search(input.value);
      if (input.value.trim() === '') {
        resultsDiv.innerHTML = '';
      } else if (results.length === 0) {
        resultsDiv.innerHTML = `<p class="search-no-results">${this.t('search.noResults')}</p>`;
      } else {
        resultsDiv.innerHTML = results.map(r => `
          <a class="search-result" href="/${ctx.lang}/blog/${r.slug}" onclick="event.preventDefault(); window._quarkdown.navigateTo('/${ctx.lang}/blog/${r.slug}');">
            <strong>${r.title}</strong>
            <span>${r.description}</span>
          </a>
        `).join('');
      }
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this._closeSearch();
    });

    const onEsc = (e) => {
      if (e.key === 'Escape') {
        this._closeSearch();
        document.removeEventListener('keydown', onEsc);
      }
    };
    document.addEventListener('keydown', onEsc);
  }

  _closeSearch() {
    const overlay = document.querySelector('.search-overlay');
    if (overlay) overlay.remove();
  }
}

export { Router } from './router.js';
export { I18n } from './i18n.js';
export { ContentLoader } from './content.js';
export { BlogEngine } from './blog.js';
export { MetaManager } from './meta.js';
export { initCursorDot, initStarfield } from './effects.js';
export { Analytics } from './analytics.js';
export { SearchEngine } from './search.js';
