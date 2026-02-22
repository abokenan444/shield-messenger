### Deploy Directory

This directory contains deployment configuration templates.

**Files:**
- `nginx.conf` — Docker/containerized Nginx configuration
- `shieldmessenger.conf.example` — Production Nginx configuration template

**Setup:**
1. Copy `shieldmessenger.conf.example` to your server
2. Replace `YOUR_DOMAIN` with your actual domain
3. Update SSL certificate paths
4. Update the web root path

> ⚠️ Never commit production configs with real domain names or paths.
