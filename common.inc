# Shared by both sites in nginx.conf.
error_page 404 /404.html;

gzip on;
gzip_types text/html text/css application/javascript image/svg+xml application/xml text/plain;
gzip_min_length 512;

location / {
    add_header Cache-Control $static_cache;
    try_files $uri $uri/index.html =404;
}
