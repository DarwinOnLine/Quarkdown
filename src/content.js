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

  /** Open external links in a new tab (skips links that already have a target attribute) */
  openExternalLinks(container) {
    container.querySelectorAll('a[href^="http"]:not([target])').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    });
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
