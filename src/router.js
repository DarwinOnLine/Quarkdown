// SPA Router with History API and async race-condition protection

export class Router {
  constructor({ languages = ['en'], onRoute, onNavigate }) {
    this._routeId = 0;
    this._animationId = null;
    this.languages = languages;
    this.onRoute = onRoute;
    this.onNavigate = onNavigate;
  }

  start() {
    window.addEventListener('popstate', () => {
      this.stopAnimations();
      this._dispatch();
    });

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href');
      // Hash-only links: handle manually to avoid <base> tag interference
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.getElementById(href.slice(1));
        if (target) {
          history.replaceState(null, '', window.location.pathname + window.location.search + href);
          target.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        e.preventDefault();
        this.navigateTo(href);
      }
    });

    this._dispatch();
  }

  navigateTo(path) {
    this.stopAnimations();
    history.pushState(null, '', path);
    this._dispatch();
  }

  /** Returns a unique route ID for race-condition checking */
  nextRouteId() {
    return ++this._routeId;
  }

  /** Check if a route ID is still the current one */
  isActive(routeId) {
    return this._routeId === routeId;
  }

  /** Track animation frames for cleanup on navigation */
  trackAnimation(id) {
    this._animationId = id;
  }

  stopAnimations() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    document.body.style.overflow = '';
  }

  _dispatch() {
    const routeId = this.nextRouteId();
    let path = window.location.pathname || '/';

    // Extract language prefix
    const langPattern = new RegExp(`^\\/(${this.languages.join('|')})(?=\\/|$)`);
    const langMatch = path.match(langPattern);
    let lang = null;

    if (langMatch) {
      lang = langMatch[1];
      path = path.replace(langPattern, '') || '/';
    }

    // Remove trailing slash
    path = path.replace(/\/$/, '') || '/';

    // Parse query params
    const params = Object.fromEntries(new URLSearchParams(window.location.search));

    this.onRoute({ path, lang, params, routeId });
  }
}
