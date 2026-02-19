FROM nginx:alpine

# Store Quarkdown engine in /opt (will be copied at runtime)
COPY src/ /opt/quarkdown/src/
COPY themes/ /opt/quarkdown/themes/

# Default content (used if no volume mounted)
COPY template/index.html /usr/share/nginx/html/
COPY template/404.html /usr/share/nginx/html/
COPY template/home-*.md /usr/share/nginx/html/
COPY template/posts/ /usr/share/nginx/html/posts/

# SPA-compatible nginx config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Entrypoint copies engine to webroot before starting nginx
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]

# Labels
LABEL org.opencontainers.image.title="Quarkdown"
LABEL org.opencontainers.image.description="Zero-dependency Markdown blog engine for GitHub Pages"
LABEL org.opencontainers.image.source="https://github.com/DarwinOnLine/quarkdown"
LABEL org.opencontainers.image.licenses="MIT"
