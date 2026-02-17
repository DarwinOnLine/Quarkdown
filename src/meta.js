// Meta tags and Open Graph management

export class MetaManager {
  constructor({ siteName, baseUrl, defaultImage }) {
    this.siteName = siteName;
    this.baseUrl = baseUrl;
    this.defaultImage = defaultImage ? `${baseUrl}/${defaultImage}` : '';
  }

  /** Update document meta tags for current page */
  update(post = null) {
    const title = post ? `${post.title} - ${this.siteName}` : this.siteName;
    const description = post?.description || this.siteName;
    const image = post?.image ? `${this.baseUrl}/${post.image}` : this.defaultImage;

    document.title = title;

    const metaMap = {
      'og:title': title,
      'og:description': description,
      'og:image': image,
      'og:url': window.location.href,
      'twitter:title': title,
      'twitter:description': description,
      'twitter:image': image,
    };

    for (const [property, content] of Object.entries(metaMap)) {
      const meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
      if (meta) meta.setAttribute('content', content);
    }
  }
}
