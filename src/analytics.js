// Analytics module - Provider-agnostic page view tracking for SPA

const providers = {
  umami: {
    inject({ src, websiteId }) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = src || 'https://cloud.umami.is/script.js';
      script.dataset.websiteId = websiteId;
      document.head.appendChild(script);
    },
    trackPageView(url) {
      if (typeof window.umami !== 'undefined') {
        window.umami.track(props => ({ ...props, url }));
      }
    },
  },

  plausible: {
    inject({ src, domain }) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = src || 'https://plausible.io/js/script.js';
      script.dataset.domain = domain;
      document.head.appendChild(script);
      window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
    },
    trackPageView(url) {
      if (typeof window.plausible !== 'undefined') {
        window.plausible('pageview', { u: url });
      }
    },
  },

  fathom: {
    inject({ src, siteId }) {
      const script = document.createElement('script');
      script.defer = true;
      script.src = src || 'https://cdn.usefathom.com/script.js';
      script.dataset.site = siteId;
      script.dataset.spa = 'auto';
      document.head.appendChild(script);
    },
    trackPageView(url) {
      if (typeof window.fathom !== 'undefined') {
        window.fathom.trackPageview({ url });
      }
    },
  },

  gtag: {
    inject({ measurementId }) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', measurementId, { send_page_view: false });
    },
    trackPageView(url) {
      if (typeof window.gtag !== 'undefined') {
        window.gtag('event', 'page_view', { page_path: url });
      }
    },
  },
};

export class Analytics {
  /**
   * @param {Object} config
   * @param {string} config.provider - Provider name: 'umami', 'plausible', 'fathom', 'gtag', or 'custom'
   * @param {Function} [config.trackPageView] - Custom trackPageView(url) function (when provider is 'custom')
   * @param {string} [config.src] - Script URL override
   * @param {string} [config.websiteId] - Umami website ID
   * @param {string} [config.domain] - Plausible domain
   * @param {string} [config.siteId] - Fathom site ID
   * @param {string} [config.measurementId] - Google Analytics measurement ID
   */
  constructor(config) {
    this.config = config;
    this.provider = config.provider === 'custom' ? null : providers[config.provider];

    if (this.provider) {
      this.provider.inject(config);
    }
  }

  trackPageView(url) {
    if (this.config.provider === 'custom' && typeof this.config.trackPageView === 'function') {
      this.config.trackPageView(url);
    } else if (this.provider) {
      this.provider.trackPageView(url);
    }
  }
}
