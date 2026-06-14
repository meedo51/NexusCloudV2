# NexusCloud ☁️

> **Modern File Management & Sharing Platform** — Glassmorphism UI, drag-and-drop uploads, expiring shareable links with optional password protection.

![Tech Stack](https://img.shields.io/badge/React-20232A?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-06B6D4?logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-000000?logo=express)
![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker)

---

## ✨ Features

- **🔐 User Authentication** — JWT-based signup/login (easily extend to OAuth/SSO)
- **📤 Drag & Drop Upload** — Progress bars, multi-file support
- **📁 Folder Management** — Create, rename, delete, and navigate nested folders
- **🖼️ File Previews** — Images, PDFs, text files (inline preview)
- **🔗 Shareable Links** — Expiring links (default 7 days), optional password protection
- **🔍 Search & Filter** — By filename, file type (image, document, etc.)
- **🎨 Glassmorphism UI** — Animated gradient background, smooth transitions, shimmer loading
- **📱 Responsive** — Grid/list toggle, mobile bottom nav, touch-friendly

---

## 🚀 Quick Start (Docker)

### Prerequisites

- Docker & Docker Compose v2
- A VPS or server with Docker installed

### One-liner Deploy

```bash
git clone https://github.com/yourusername/nexuscloud.git
cd nexuscloud
cp .env.example .env
# Edit .env — set a strong JWT_SECRET
docker compose up -d --build
```

The app will be available at `http://your-server-ip:80`.

---

## 🛠️ Manual Development Setup

### Backend

```bash
cd backend
cp ../.env.example .env
npm install
npm run dev   # Starts on :4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev   # Starts on :5173, proxies API to :4000
```

---

## 🐳 Docker Architecture

```
                    ┌─────────────┐
                    │   Browser   │
                    └──────┬──────┘
                           │ :80
                    ┌──────▼──────┐
                    │   Nginx     │  ← Frontend container
                    │  (SPA+Proxy)│
                    └──────┬──────┘
                           │ /api/* → :4000
                    ┌──────▼──────┐
                    │   Express   │  ← Backend container
                    │   (API)     │
                    └──┬──────┬───┘
                       │      │
              ┌────────▼┐ ┌──▼────────┐
              │ uploads  │ │  database │
              │ (Volume) │ │  (Volume) │
              └──────────┘ └───────────┘
```

### Multi-stage builds

- **Backend**: `node:20-alpine` → builds TypeScript → runs lightweight production image
- **Frontend**: `node:20-alpine` → builds Vite app → serves via `nginx:1.27-alpine`

### Volumes

| Volume | Container path | Purpose |
|--------|---------------|---------|
| `uploads` | `/app/uploads` | Persisted uploaded files |
| `database` | `/app/data` | SQLite database |

---

## 🔧 Nginx Reverse Proxy + Let's Encrypt (Production)

For production with a domain, set up a reverse proxy on the host:

```bash
# Install Nginx and Certbot
apt install nginx certbot python3-certbot-nginx -y

# Create Nginx site config
cat > /etc/nginx/sites-available/nexuscloud << 'EOF'
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/nexuscloud /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com
```

### Alternative: Caddy (simpler)

Create `Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:80
}
```

```bash
docker run -d \
  -p 80:80 -p 443:443 \
  -v $PWD/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:2
```

---

## 🔐 Extending Authentication

The current implementation uses a simple JWT + SQLite approach:

1. **User model** is in `backend/src/routes/auth.ts`
2. **JWT secret** is set via `JWT_SECRET` env var
3. To add OAuth (Google, GitHub):
   - Install `passport` + `passport-google-oauth20`
   - Create a new route `backend/src/routes/auth-google.ts`
   - Add strategy and merge with existing `/auth/me` pattern

To switch to PostgreSQL/MySQL:
1. Install `pg` or `mysql2` + `knex` or `prisma`
2. Replace `better-sqlite3` calls in `backend/src/database.ts` and all route files

---

## 📁 Project Structure

```
nexuscloud/
├── backend/
│   ├── src/
│   │   ├── routes/          # auth, files, share endpoints
│   │   ├── middleware/       # JWT auth, file upload
│   │   ├── types/           # TypeScript interfaces
│   │   ├── database.ts      # SQLite setup
│   │   └── index.ts         # Express app entry
│   ├── Dockerfile.backend
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Layout, Sidebar, FileCard, UploadZone, etc.
│   │   ├── pages/           # Login, Register, Dashboard, SharedFile, ShareManage
│   │   ├── contexts/        # AuthContext
│   │   ├── services/        # API client (axios)
│   │   ├── types/           # Frontend interfaces
│   │   ├── App.tsx          # Router
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Tailwind + glassmorphism utilities
│   ├── public/
│   ├── Dockerfile.frontend
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── nginx.conf               # (root-level reference)
├── .env.example
└── README.md
```

---

## 🌐 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `nexuscloud-dev-secret...` | JWT signing key (change in production!) |
| `PORT` | `4000` | Backend port |
| `DB_PATH` | `/app/data/nexuscloud.db` | SQLite file location |
| `UPLOAD_DIR` | `/app/uploads` | File storage path |
| `MAX_FILE_SIZE` | `52428800` | Max upload size (bytes, default 50MB) |
| `CORS_ORIGIN` | `*` | CORS allowed origin |
| `VITE_API_URL` | `/api` | API URL for frontend build |

---

## 🧪 Commands

```bash
# Development
docker compose up -d --build    # Build & start all services
docker compose logs -f          # Follow logs
docker compose down             # Stop services

# Production deployment
cp .env.example .env
# Edit .env with secure values
docker compose up -d --build

# Backup (SQLite + uploads)
docker run --rm -v nexuscloud_uploads:/uploads -v $(pwd):/backup alpine \
    tar czf /backup/nexuscloud-backup-$(date +%Y%m%d).tar.gz /uploads
docker run --rm -v nexuscloud_database:/data -v $(pwd):/backup alpine \
    tar czf /backup/nexuscloud-db-$(date +%Y%m%d).tar.gz /data
```

---

## 🎨 Design System

- **Background**: Deep space (`#0B0F19`) with animated gradient mesh
- **Primary accent**: Electric cyan (`#00F0FF`)
- **Secondary accent**: Vibrant coral (`#FF6B6B`)
- **Glass panels**: `backdrop-filter: blur(20px)` with subtle borders
- **Cards**: Hover lift with `translateY(-2px)` + glow shadow
- **Loading**: Shimmer skeleton animation
- **Typography**: Inter (body), JetBrains Mono (code)

---

## 📄 License

MIT
