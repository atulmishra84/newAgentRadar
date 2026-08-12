# Azure Docker Deployment Guide

This guide covers deploying the AgentRadar application to an Azure Virtual Machine using **Docker and Docker Compose**. 

Depending on your environment, follow the instructions for **Scenario A** (Domain with HTTPS) or **Scenario B** (Raw IP with HTTP).

---

## 1. Prepare Your `.env` File
Create a `.env` file on your server containing your production secrets. You must set the correct URL variables depending on your deployment:

**If deploying to a domain:**
```env
POSTGRES_PASSWORD=your_secure_password
APP_URL=https://agentradar.idenaccess.com
ALLOWED_ORIGINS=https://agentradar.idenaccess.com
```

**If deploying to an IP:**
```env
POSTGRES_PASSWORD=your_secure_password
APP_URL=http://<YOUR_AZURE_VM_IP>
ALLOWED_ORIGINS=http://<YOUR_AZURE_VM_IP>
```

---

## 2. Nginx Configuration & Certificates

The Nginx container handles routing, serving static frontend files, and acting as a reverse proxy for the API. 

### Scenario A: Deploying on Domain (`agentradar.idenaccess.com`)
If you are deploying to your domain, you **must use HTTPS**. You will need to update the default `nginx.conf` to handle SSL certificates and listen on port 443.

**Getting a Certificate using Certbot on your Azure VM:**
If you don't have a certificate yet, you can generate a free one using Certbot directly on your Azure VM.
1. SSH into your Azure VM.
2. Install Certbot:
   ```bash
   sudo apt update
   sudo apt install certbot
   ```
3. Generate the certificate (ensure port 80 is open and no other web server is running):
   ```bash
   sudo certbot certonly --standalone -d agentradar.idenaccess.com
   ```
4. Certbot will save your certificates in `/etc/letsencrypt/live/agentradar.idenaccess.com/`.
5. Create a `certs/` directory in your project folder on the VM and copy the files:
   ```bash
   mkdir -p certs
   sudo cp /etc/letsencrypt/live/agentradar.idenaccess.com/fullchain.pem certs/cert.pem
   sudo cp /etc/letsencrypt/live/agentradar.idenaccess.com/privkey.pem certs/key.pem
   sudo chown $USER:$USER certs/*.pem
   ```

**Requirements:**
1. You **must** have valid SSL certificates for `agentradar.idenaccess.com`.
2. Place your certificate file (`cert.pem` or `fullchain.pem`) and your private key (`key.pem` or `privkey.pem`) into a folder named `certs/` on your server.
3. Ensure your `nginx.conf` references them correctly (the configuration expects `/etc/nginx/certs/cert.pem` and `/etc/nginx/certs/key.pem`).
4. Copy the `certs/` folder to your Azure VM along with the rest of your files (if you generated them locally instead of on the VM).

**Nginx Configuration (`nginx.conf`):**
Make sure your `nginx.conf` is configured for HTTPS. Replace the contents of your `nginx.conf` with the following block:

```nginx
server {
    listen 80;
    server_name agentradar.idenaccess.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name agentradar.idenaccess.com;

    ssl_certificate /etc/nginx/certs/cert.pem;
    ssl_certificate_key /etc/nginx/certs/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root  /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript application/json;

    location /health {
        access_log off;
        add_header Content-Type text/plain always;
        return 200 "ok";
    }

    location /api {
        proxy_pass         http://agentradar-api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location /ws {
        proxy_pass         http://agentradar-api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 3600s;
    }

    location ~* \.js$ {
        add_header Content-Type          "application/javascript; charset=utf-8" always;
        add_header Cache-Control         "no-store, no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
}
```

### Scenario B: Deploying on a Raw IP
If you are deploying directly to an IP address, you will not have SSL certificates. If you use the default `nginx.conf` without certs, the Nginx container will instantly crash.

**Requirements:**
1. Do **not** copy the `certs/` folder to the server.
2. You **must** replace the contents of your `nginx.conf` with the following HTTP-only block:

```nginx
server {
    listen 80;
    server_name _;

    root  /usr/share/nginx/html;
    index index.html;
    gzip on;
    gzip_types text/css application/javascript application/json;

    location /health {
        access_log off;
        add_header Content-Type text/plain always;
        return 200 "ok";
    }

    location /api {
        proxy_pass         http://agentradar-api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto http;
        proxy_read_timeout 120s;
    }

    location /ws {
        proxy_pass         http://agentradar-api:4000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade    $http_upgrade;
        proxy_set_header   Connection "upgrade";
        proxy_read_timeout 3600s;
    }

    location ~* \.js$ {
        add_header Content-Type          "application/javascript; charset=utf-8" always;
        add_header Cache-Control         "no-store, no-cache, must-revalidate" always;
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }
}
```

---

## 3. Build & Transfer Files
1. Build the React frontend locally before transferring:
   ```bash
   cd apps/web
   npm run build
   cd ../..
   ```
2. Copy the necessary files to your Azure VM:
   - `docker-compose.yml`
   - `.env`
   - `nginx.conf` (Either the default for Domain, or the modified HTTP one for IP)
   - `certs/` (**Only** if deploying to the Domain)
   - `apps/web/dist/`
   - All Backend files (`server.js`, `azureDiscovery.js`, `src/`, `package.json`, etc.)

---

## 4. Deploy on the Azure VM

SSH into your Azure VM, navigate to the folder with your files, and start the stack:

```bash
docker-compose up -d --build
```

Verify everything is running:
```bash
docker ps
```
You should see 4 containers running (`agentRadar-frontend`, `agentRadar-api`, `agentRadar-postgres`, `agentRadar-redis`).

---

## 5. Network Security Group (NSG) & DNS
In your Azure Portal, ensure your VM's **Network Security Group (NSG)** has inbound rules allowing traffic on:
- **Port 80 (HTTP)**
- **Port 443 (HTTPS)** *(Only required for Domain deployment)*

If deploying to the domain, ensure your DNS A-Record for `agentradar.idenaccess.com` points to your Azure VM's public IP address.
