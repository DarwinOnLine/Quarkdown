#!/bin/sh
# Copy Quarkdown engine to webroot (don't overwrite user files)
cp -rn /opt/quarkdown/src /usr/share/nginx/html/ 2>/dev/null || true
cp -rn /opt/quarkdown/themes /usr/share/nginx/html/ 2>/dev/null || true

exec nginx -g 'daemon off;'
