#!/bin/bash
set -e

# Truckify Deployment Script
# Detects existing reverse proxy or sets up new one

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${SSL_EMAIL:-admin@$DOMAIN}"
API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"

echo "🚚 Truckify Deployment Script"
echo "=============================="
echo "Domain: $DOMAIN"

# Detect existing reverse proxy
detect_proxy() {
    # Check for running nginx
    if docker ps --format '{{.Names}}' | grep -qiE '^nginx$|nginx-proxy|reverse-proxy'; then
        PROXY_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE '^nginx$|nginx-proxy|reverse-proxy' | head -1)
        echo "✓ Found existing nginx: $PROXY_CONTAINER"
        echo "nginx:$PROXY_CONTAINER"
        return 0
    fi
    
    # Check for traefik
    if docker ps --format '{{.Names}}' | grep -qi traefik; then
        PROXY_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i traefik | head -1)
        echo "✓ Found existing traefik: $PROXY_CONTAINER"
        echo "traefik:$PROXY_CONTAINER"
        return 0
    fi
    
    # Check for nginx-proxy-manager
    if docker ps --format '{{.Names}}' | grep -qi 'nginx-proxy-manager\|npm'; then
        PROXY_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'nginx-proxy-manager|npm' | head -1)
        echo "✓ Found nginx-proxy-manager: $PROXY_CONTAINER"
        echo "npm:$PROXY_CONTAINER"
        return 0
    fi
    
    echo "none:"
    return 1
}

# Configure existing nginx
configure_nginx() {
    local container=$1
    echo "📝 Configuring existing nginx..."
    
    # Find nginx config directory
    local conf_dir=$(docker inspect "$container" --format '{{range .Mounts}}{{if eq .Type "bind"}}{{if contains .Destination "conf"}}{{.Source}}{{end}}{{end}}{{end}}' | head -1)
    
    if [ -z "$conf_dir" ]; then
        conf_dir="/etc/nginx/conf.d"
        echo "Using default config path, copying into container..."
        docker cp "$SCRIPT_DIR/nginx/truckify.conf" "$container:/etc/nginx/conf.d/truckify.conf"
    else
        echo "Found config dir: $conf_dir"
        sudo cp "$SCRIPT_DIR/nginx/truckify.conf" "$conf_dir/truckify.conf"
    fi
    
    # Update domain in config
    docker exec "$container" sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/conf.d/truckify.conf 2>/dev/null || true
    
    # Reload nginx
    docker exec "$container" nginx -s reload
    echo "✓ Nginx configured and reloaded"
}

# Configure existing traefik (via labels on our containers)
configure_traefik() {
    echo "📝 Traefik detected - labels will be applied via docker-compose"
    export USE_TRAEFIK=true
}

# Setup new nginx reverse proxy
setup_new_proxy() {
    echo "📝 Setting up new nginx reverse proxy..."
    
    cd "$SCRIPT_DIR/docker"
    docker compose -f docker-compose.proxy.yml up -d
    
    echo "✓ Nginx proxy started"
    
    if [ "$DOMAIN" != "localhost" ]; then
        echo "🔐 Setting up SSL with Let's Encrypt..."
        docker exec truckify-proxy certbot --nginx -d "$DOMAIN" -d "api.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" || echo "⚠ SSL setup failed - continuing without SSL"
    fi
}

# Create nginx config
create_nginx_config() {
    mkdir -p "$SCRIPT_DIR/nginx"
    cat > "$SCRIPT_DIR/nginx/truckify.conf" << 'NGINX'
upstream truckify_api {
    server api-gateway:8000;
}

upstream truckify_web {
    server truckify-web:80;
}

# API
server {
    listen 80;
    server_name api.DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://truckify_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Web Frontend
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    location / {
        proxy_pass http://truckify_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://truckify_api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX
    sed -i.bak "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$SCRIPT_DIR/nginx/truckify.conf" 2>/dev/null || \
    sed -i '' "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" "$SCRIPT_DIR/nginx/truckify.conf"
    rm -f "$SCRIPT_DIR/nginx/truckify.conf.bak"
}

# Create proxy docker-compose
create_proxy_compose() {
    cat > "$SCRIPT_DIR/docker/docker-compose.proxy.yml" << 'COMPOSE'
version: '3.8'

services:
  proxy:
    image: nginx:alpine
    container_name: truckify-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ../nginx:/etc/nginx/conf.d
      - proxy_certs:/etc/letsencrypt
      - proxy_html:/usr/share/nginx/html
    networks:
      - truckify-network
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    container_name: truckify-certbot
    volumes:
      - proxy_certs:/etc/letsencrypt
      - proxy_html:/usr/share/nginx/html
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do sleep 12h & wait $${!}; certbot renew; done'"
    networks:
      - truckify-network

volumes:
  proxy_certs:
  proxy_html:

networks:
  truckify-network:
    external: true
COMPOSE
}

# Create web frontend Dockerfile for production
create_web_dockerfile() {
    cat > "$SCRIPT_DIR/../web/frontend/Dockerfile" << 'DOCKERFILE'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
DOCKERFILE

    cat > "$SCRIPT_DIR/../web/frontend/nginx.conf" << 'NGINXCONF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF
}

# Add web service to main docker-compose
add_web_service() {
    if ! grep -q "truckify-web:" "$SCRIPT_DIR/docker/docker-compose.yml"; then
        cat >> "$SCRIPT_DIR/docker/docker-compose.yml" << 'SERVICE'

  # Web Frontend (Production)
  truckify-web:
    build:
      context: ../../web/frontend
      dockerfile: Dockerfile
    container_name: truckify-web
    networks:
      - truckify-network
    restart: unless-stopped
SERVICE
        echo "✓ Added web service to docker-compose"
    fi
}

# Main deployment
main() {
    echo ""
    
    # Create configs
    create_nginx_config
    create_proxy_compose
    create_web_dockerfile
    add_web_service
    
    # Detect proxy
    echo "🔍 Detecting existing reverse proxy..."
    PROXY_INFO=$(detect_proxy) || true
    PROXY_TYPE=$(echo "$PROXY_INFO" | cut -d: -f1)
    PROXY_CONTAINER=$(echo "$PROXY_INFO" | cut -d: -f2)
    
    # Start Truckify services
    echo ""
    echo "🚀 Starting Truckify services..."
    cd "$SCRIPT_DIR/docker"
    docker compose up -d --build
    
    echo ""
    
    # Configure proxy
    case "$PROXY_TYPE" in
        nginx)
            configure_nginx "$PROXY_CONTAINER"
            ;;
        traefik)
            configure_traefik
            ;;
        npm)
            echo "📝 Nginx Proxy Manager detected"
            echo "   Add proxy hosts manually in NPM admin UI:"
            echo "   - $DOMAIN -> truckify-web:80"
            echo "   - api.$DOMAIN -> api-gateway:8000"
            ;;
        *)
            setup_new_proxy
            ;;
    esac
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "Access your services:"
    if [ "$DOMAIN" = "localhost" ]; then
        echo "  Web:     http://localhost"
        echo "  API:     http://localhost/api"
        echo "  Grafana: http://localhost:3000"
    else
        echo "  Web:     https://$DOMAIN"
        echo "  API:     https://api.$DOMAIN"
        echo "  Grafana: https://$DOMAIN:3000"
    fi
}

main "$@"
