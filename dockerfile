FROM --platform=linux/amd64 nginx:alpine

# Copy your static files
COPY index.html /usr/share/nginx/html/
COPY script.js  /usr/share/nginx/html/
COPY style.css  /usr/share/nginx/html/

EXPOSE 80
