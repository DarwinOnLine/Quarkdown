// Content loading and rendering module

export class ContentLoader {
  constructor({ cacheBust = true } = {}) {
    this.cacheBust = cacheBust;
  }

  /** Fetch a Markdown file and return raw text */
  async fetchMarkdown(path) {
    const url = this.cacheBust ? `${path}?t=${Date.now()}` : path;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${path}`);
    return response.text();
  }

  /** Fetch a JSON file */
  async fetchJSON(path) {
    const url = this.cacheBust ? `${path}?t=${Date.now()}` : path;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${path}`);
    return response.json();
  }

  /** Parse Markdown to HTML using marked.js (must be loaded globally) */
  parseMarkdown(markdown) {
    if (typeof marked === 'undefined') {
      console.warn('Quarkdown: marked.js is not loaded. Returning raw markdown.');
      return `<pre>${markdown}</pre>`;
    }
    return marked.parse(markdown);
  }

  /** Apply syntax highlighting to code blocks in a container */
  highlightCode(container) {
    if (typeof hljs === 'undefined') return;

    container.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block);

      const pre = block.parentElement;
      if (pre.hasAttribute('data-line-numbers') && typeof hljs.lineNumbersBlock === 'function') {
        hljs.lineNumbersBlock(block);
        pre.classList.add('has-line-numbers');
      }
    });
  }

  /** Add anchor IDs to headings for deep linking */
  addHeadingAnchors(container) {
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (heading.id) return;
      heading.id = heading.textContent.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    });
  }

  /** Scroll to the current URL hash target and trigger highlight animation */
  scrollToHash() {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    target.scrollIntoView();
    if (target.classList.contains('anchor-highlight')) {
      target.style.animation = 'none';
      target.offsetHeight; // force reflow
      target.style.animation = '';
      target.classList.add('anchor-flash');
    }
  }

  /** Open external links in a new tab (skips links that already have a target attribute) */
  openExternalLinks(container) {
    container.querySelectorAll('a[href^="http"]:not([target])').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
  }

  /** Add loading="lazy" to all images */
  lazyLoadImages(container) {
    container.querySelectorAll('img:not([loading])').forEach((img) => {
      img.setAttribute('loading', 'lazy');
    });
  }

  /** Generate a table of contents from h2/h3 headings */
  generateTOC(container, label = 'Table of contents') {
    const headings = container.querySelectorAll('h2, h3');
    if (headings.length === 0) return null;

    const items = Array.from(headings).map((h) => {
      const level = h.tagName === 'H3' ? 'toc-h3' : 'toc-h2';
      return `<li class="${level}"><a href="#${h.id}">${h.textContent}</a></li>`;
    }).join('');

    const nav = document.createElement('nav');
    nav.className = 'toc-panel';
    nav.innerHTML = `<div class="toc-title">${label}</div><ul>${items}</ul>`;
    return nav;
  }

  /** Re-execute <script> tags injected via innerHTML */
  executeScripts(container) {
    container.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach(attr => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
}
