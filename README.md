# NexusCloud ☁️

> **Ultimate Cloud Files & Documents Platform** — Self-hosted, feature-rich file sharing with a rich text document editor (NexusDocs), team workspaces, 2FA, WebDAV, version history, and full-text search.

[![Status](https://img.shields.io/badge/Status-Active-00F0FF?style=flat-square)](https://github.com/yourusername/nexuscloud)
[![License](https://img.shields.io/badge/License-MIT-FF6B6B?style=flat-square)](LICENSE)
[![Docker Pulls](https://img.shields.io/badge/Docker-PostgreSQL%2016-336791?style=flat-square&logo=postgresql)](https://hub.docker.com/_/postgres)
[![React](https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TipTap](https://img.shields.io/badge/Editor-TipTap-FF6B6B?style=flat-square&logo=prosemirror)](https://tiptap.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Complete Feature List](#-complete-feature-list)
- [Tech Stack](#️-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start with Docker (Production)](#-quick-start-with-docker-production)
- [PostgreSQL Setup Details](#-postgresql-setup-details)
- [Development Setup (SQLite)](#-development-setup-sqlite-for-faster-iteration)
- [Configuration Reference](#-configuration-reference)
- [Environment Setup Steps](#-environment-setup-steps)
- [Database Management](#-database-management)
- [Troubleshooting PostgreSQL](#-troubleshooting-postgresql)
- [Upgrading NexusCloud](#-upgrading-nexuscloud)
- [Performance Tuning (PostgreSQL)](#-performance-tuning-postgresql)
- [Security Best Practices](#-security-best-practices)
- [Monitoring & Logs](#-monitoring--logs)
- [Uninstalling](#-uninstalling)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🚀 Project Overview

NexusCloud is a **self-hosted, full-featured cloud files & documents platform** designed for individuals and teams who want complete control over their data. With a modern glassmorphism UI, it combines Dropbox/Google Drive-like file management with a powerful rich text document editor (NexusDocs) — all without third-party dependency.

**Value Proposition:**
- 🔒 **Privacy-first** — Your files, your server, your rules
- 📝 **NexusDocs** — Built-in rich text editor with TipTap/ProseMirror
- 📦 **All-in-one** — Sharing, versioning, search, workspaces, 2FA, WebDAV
- 🐳 **Easy deploy** — Single `docker-compose up -d` to get started
- 🎨 **Modern UX** — Drag-and-drop, responsive design, smooth animations, glassmorphism
- 🔧 **Extensible** — PostgreSQL primary with SQLite dev option, S3-compatible storage ready

---

## ✨ Complete Feature List

### ✅ File Management

| Feature | Description |
|---------|-------------|
| **User Authentication** | JWT-based register/login with bcrypt password hashing |
| **Folder & File CRUD** | Create, rename, delete, move, and navigate nested folders |
| **File Upload** | Drag-and-drop with progress bars, multi-file + folder support |
| **Rename Files & Folders** | Inline rename with context menu or double-click |
| **Share with Expiration & Password** | Expiring shareable links (default 7 days) with optional password protection |
| **File Preview** | Inline preview for images, PDFs, text files |
| **Download Files** | Single file download with direct links |
| **Compress Selected Files** | Batch compress to ZIP archive |
| **Batch Select with Actions** | Multi-select for compress, delete, move operations |
| **Profile Preview & Management** | Update display name, email, password, preferences |
| **Soft Delete with Trash** | Deleted files move to trash; 30-day auto-purge configurable |
| **Storage Quota per User** | Configurable per-user storage limits with live usage tracking |
| **Breadcrumb Navigation** | Clickable path traversal with folder hierarchy |
| **Search with Filters** | Filter by name, file type (image/document/video/audio), date range |
| **Favorites / Starred Items** | Star files for quick access in dedicated sidebar section |
| **Drag-and-Drop Upload** | Multi-file + folder upload with visual drop zone |
| **Version History** | Last 5 versions retained per file with restore capability |
| **Activity Log** | Full audit trail with pagination and filterable history |
| **Public File Requests** | Upload links for external users (no login required) |
| **Image & Video Thumbnails** | Auto-generated thumbnails via Sharp (saved as WebP) |
| **Bulk Folder Upload** | Preserves folder hierarchy on upload |
| **Grid / List View Toggle** | Toggle with user preference saved to profile |
| **Context Menu System** | Portal-based right-click menus with keyboard navigation, submenus, framer-motion animations, and auto-positioning |
| **File Icon Auto-Detection** | 150+ file extensions mapped to 13 category SVG icons with color coding; folder icons with 5 states (default, open, shared, starred, trash) |

### ✅ NexusDocs — Rich Text Documents

| Feature | Description |
|---------|-------------|
| **WYSIWYG Editor** | TipTap/ProseMirror-based rich text editing with bold, italic, headings, bullet lists, ordered lists, blockquotes, code blocks |
| **Image Insertion** | Upload from device, paste URL, or browse cloud storage with folder navigation |
| **Image Toolbar** | Bubble menu for image alignment (left/center/right) and resize presets (S/M/L/XL) |
| **Table Properties** | Bubble menu for insert/delete row/column, merge/split cells, toggle header, delete table |
| **Document Persistence** | Auto-save on Ctrl+S with content restoration across sessions |
| **Download Formats** | Export as HTML, Markdown (via turndown), or Plain Text |
| **Export to Cloud** | Save documents as HTML files in cloud storage |
| **Context Menu** | Right-click on documents for Open, Rename, Duplicate, Download, Export to Cloud, Details, Delete |
| **Rename Modal** | Inline rename with auto-select and Enter-to-submit |
| **Delete Confirmation** | Modal with loading state to prevent accidental deletion |
| **Details Panel** | Slide-in side panel with document metadata (word count, timestamps) |
| **Document Listing** | NexusDocs page with gradient branding, document cards, and new document creation |
| **Rich Document Schema** | Supports images, tables, code blocks, blockquotes, text alignment, and more |

### ✅ Code / File Editor

| Feature | Description |
|---------|-------------|
| **Syntax Highlighting** | Code editor for source files with language-aware highlighting |
| **File Editing** | Open and edit text-based files directly in the browser |
| **Save Changes** | Persist file edits back to cloud storage |

### ✅ File Icon System

| Feature | Description |
|---------|-------------|
| **Auto-Detection** | Detects file type from extension, MIME type, or special filename (Dockerfile, .gitignore, env) |
| **150+ Extension Map** | Comprehensive mapping covering code, document, image, video, audio, archive, config, database, font, certificate, and executable categories |
| **13 Category SVGs** | Hand-crafted SVG icons per category: code `<>`, document lines, image landscape, audio note, archive zipped box, video, database, config gear, certificate, font, executable, disc, report |
| **Folder Icons** | 5 states (default/open/shared/starred/trash), 10 color themes, optional count badge |
| **Animations** | Hover scale+glow, skeleton shimmer, pop-in, pulse loading states |

### 🚀 Advanced Features (Ready for Enablement)

| Feature | Description |
|---------|-------------|
| **Two-Factor Authentication** | TOTP-based 2FA with speakeasy (`ENABLE_2FA=true`) |
| **Team Workspaces with RBAC** | Admin/Member/Viewer roles, workspace invites, shared items |
| **WebDAV Support** | Mount NexusCloud as a network drive (`ENABLE_WEBDAV=true`) |
| **Full-Text Search** | PDF/DOCX/TXT content extraction and search (`ENABLE_FULLTEXT_SEARCH=true`) |
| **Desktop Sync Client** | Architecture ready for Electron/Tauri-based sync client |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS 3 + Framer Motion |
| **Rich Text Editor** | TipTap 2.x · ProseMirror · @tiptap/react (BubbleMenu, extensions: Image, Table, CodeBlock, TextStyle, TextAlign) |
| **File Icons** | Custom SVG icon system — 13 category icons, 150+ extension map, auto-detection by MIME/extension/filename |
| **Backend** | Node.js + Express 4 + TypeScript |
| **Database** | PostgreSQL 16 (primary) · SQLite via better-sqlite3 (dev) |
| **Container** | Docker & Docker Compose (Alpine-based images) |
| **File Storage** | Local Docker volumes (S3-compatible adapter ready) |
| **Task Queue** | Bull (Redis optional) for background jobs |
| **Auth** | JWT (jsonwebtoken) + bcryptjs + speakeasy (TOTP) |
| **Image Processing** | Sharp (thumbnails, WebP conversion) |
| **Search** | Full-text search via PostgreSQL `tsvector` + file content extraction (pdf-parse, mammoth) |
| **Document Export** | Turndown (HTML → Markdown) |

---

## 📋 Prerequisites

- **Docker & Docker Compose v2.0+** (for production deployment)
- **Node.js 18+** (for local development without Docker)
- **Git**
- **2 GB RAM minimum** (4 GB recommended)
- **10 GB free disk space** (scales with usage)

---

## 🐳 Quick Start with Docker (Production)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/nexuscloud.git
cd nexuscloud

# 2. Copy environment configuration
cp .env.example .env

# 3. Generate secure credentials
#    On Linux/macOS:
#    openssl rand -hex 32          -> use as JWT_SECRET
#    openssl rand -base64 24       -> use as DB_PASSWORD
#
#    On Windows (PowerShell):
#    [Convert]::ToBase64String((1..32|%{Get-Random -Max 256})) -> JWT_SECRET
#    [Convert]::ToBase64String((1..24|%{Get-Random -Max 256})) -> DB_PASSWORD

# 4. Edit .env with your generated values
#    JWT_SECRET=<your-64-char-random-secret>
#    DB_PASSWORD=<your-strong-password>

# 5. Start all services
docker compose up -d --build

# 6. Verify all services are healthy
docker compose ps

# Expected output:
# NAME                  IMAGE                       STATUS
# nexuscloud-postgres   postgres:16-alpine          Up (healthy)
# nexuscloud-backend    nexuscloud-backend          Up (healthy)
# nexuscloud-frontend   nexuscloud-frontend         Up

# 7. Verify API health
curl http://localhost:5000/api/health
# Expected: {"status":"ok"}

# 8. Access NexusCloud
#    Web UI:  http://localhost:9000
```

### Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **NexusCloud Web UI** | `http://localhost:9000` | Register new account |
| **Backend API** | `http://localhost:5000/api` | JWT via login |
| **PostgreSQL** | `localhost:5432` | `nexuscloud` / `<DB_PASSWORD>` |

---

## 🗄️ PostgreSQL Setup Details

### Automatic (Docker) — Recommended

PostgreSQL 16 Alpine runs in a container with:
- **Persistent volume** `postgres_data` — survives container restarts
- **Health checks** via `pg_isready` — backend waits for DB readiness
- **Auto-initialization** — `backend/migrations/init.sql` mounts to `/docker-entrypoint-initdb.d/init.sql`
- **UTF-8 encoding** — Set via `POSTGRES_INITDB_ARGS`

The schema creates these tables:
`users`, `files`, `share_links`, `favorites`, `file_versions`, `activity_logs`, `upload_requests`, `workspaces`, `workspace_members`, `workspace_items`, `workspace_invites`, `file_contents`

### Manual PostgreSQL Installation

<details>
<summary><b>Ubuntu / Debian</b></summary>

```bash
# Install PostgreSQL 16
sudo apt update
sudo apt install postgresql-16 postgresql-contrib-16

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOF
CREATE DATABASE nexuscloud;
CREATE USER nexuscloud WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nexuscloud TO nexuscloud;
\c nexuscloud
CREATE EXTENSION IF NOT EXISTS pgcrypto;
EOF

# Run migration
psql -U nexuscloud -d nexuscloud -f backend/migrations/init.sql

# Update .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nexuscloud
DB_USER=nexuscloud
DB_PASSWORD=your_secure_password
```
</details>

<details>
<summary><b>macOS (Homebrew)</b></summary>

```bash
# Install PostgreSQL 16
brew install postgresql@16
brew services start postgresql@16

# Create database and user
createdb nexuscloud
createuser nexuscloud
psql -c "ALTER USER nexuscloud WITH PASSWORD 'your_secure_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE nexuscloud TO nexuscloud;"
psql -d nexuscloud -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Run migration
psql -U nexuscloud -d nexuscloud -f backend/migrations/init.sql
```
</details>

<details>
<summary><b>Windows</b></summary>

1. Download installer from [postgresql.org/download/windows/](https://www.postgresql.org/download/windows/)
2. Run installer, remember the `postgres` superuser password
3. Open **pgAdmin** or **Command Prompt** (as admin):
```sql
CREATE DATABASE nexuscloud;
CREATE USER nexuscloud WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE nexuscloud TO nexuscloud;
\c nexuscloud
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```
4. Run migration:
```powershell
psql -U nexuscloud -d nexuscloud -f backend/migrations/init.sql
```
</details>

---

## 🧪 Development Setup (SQLite for Faster Iteration)

```bash
# 1. Clone and install
git clone https://github.com/yourusername/nexuscloud.git
cd nexuscloud

# 2. Configure for SQLite
cp .env.example .env
# Add or uncomment:
echo "DB_TYPE=sqlite" >> .env

# 3. Start backend with hot-reload
cd backend
npm install
npm run dev        # Starts on :4000 with tsx watch

# 4. Start frontend (separate terminal)
cd frontend
npm install
npm run dev        # Starts on :5173, proxies API to :4000

# 5. Open http://localhost:5173
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm run start` | Run compiled production build |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run test suite (vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## ⚙️ Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Runtime environment |
| `PORT` | `4000` | Backend API port |
| `JWT_SECRET` | *(required)* | JWT signing secret (64+ chars, random) |
| `DB_HOST` | `postgres` | Database host |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `nexuscloud` | Database name |
| `DB_USER` | `nexuscloud` | Database user |
| `DB_PASSWORD` | `changeme` | Database password |
| `DB_SSL` | `false` | Enable SSL for database connection |
| `DATABASE_URL` | *(composed)* | Full PostgreSQL connection string |
| `UPLOAD_DIR` | `/app/uploads` | File storage directory |
| `MAX_FILE_SIZE` | `52428800` | Max upload size in bytes (50 MB) |
| `CORS_ORIGIN` | `*` | CORS allowed origin |
| `BACKEND_PORT` | `5000` | Host port mapped to backend container |
| `FRONTEND_PORT` | `9000` | Host port mapped to frontend container |
| `ENABLE_2FA` | `true` | Enable two-factor authentication |
| `ENABLE_WEBDAV` | `true` | Enable WebDAV server |
| `ENABLE_FULLTEXT_SEARCH` | `true` | Enable full-text content search |
| `WEBDAV_PORT` | `4001` | WebDAV server port |
| `MAX_FILE_VERSIONS` | `5` | Number of versions to retain per file |
| `VERSION_PURGE_INTERVAL_MS` | `3600000` | Version cleanup interval (1 hour) |
| `PURGE_INTERVAL_MS` | `86400000` | Trash purge interval (24 hours) |

---

## 🔧 Environment Setup Steps

```bash
# 1. Clone and enter project
git clone https://github.com/yourusername/nexuscloud.git
cd nexuscloud

# 2. Copy environment template
cp .env.example .env

# 3. Generate secure credentials
#    Linux/macOS:
openssl rand -hex 32    # ← Paste as JWT_SECRET
openssl rand -base64 24 # ← Paste as DB_PASSWORD

#    Windows PowerShell:
#    $jwt = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 64 | % {[char]$_})
#    $pw = -join ((65..90)+(97..122)+(48..57) | Get-Random -Count 24 | % {[char]$_})
#    Write-Host "JWT_SECRET=$jwt"
#    Write-Host "DB_PASSWORD=$pw"

# 4. Edit .env with generated values
nano .env   # or notepad .env on Windows

# 5. Launch NexusCloud
docker compose up -d --build

# 6. Verify all services
docker compose ps

# 7. Check API health
curl http://localhost:5000/api/health
# Expected: {"status":"ok"}

# 8. Open browser to http://localhost:9000
#    Register your first account — it will be the admin.
```

---

## 💾 Database Management

```bash
# Backup PostgreSQL database
docker exec nexuscloud-postgres pg_dump -U nexuscloud nexuscloud > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20250101.sql | docker exec -i nexuscloud-postgres psql -U nexuscloud nexuscloud

# Access psql console
docker exec -it nexuscloud-postgres psql -U nexuscloud nexuscloud

# Check database size
docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "
  SELECT pg_size_pretty(pg_database_size('nexuscloud')) AS size;
"

# List all tables
docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "\dt"

# Describe a table
docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "\d files"

# Reset database (development only — deletes all data!)
docker compose down -v
docker compose up -d --build
```

---

## 🔍 Troubleshooting PostgreSQL

| Problem | Solution |
|---------|----------|
| **Connection refused** | Check PostgreSQL is running: `docker compose ps` |
| **Authentication failed** | Verify `DB_PASSWORD` in `.env` matches container env |
| **Database not found** | Init script may have failed; manually run migration: `docker exec nexuscloud-backend npm run db:migrate` |
| **Disk full** | Clean old volumes: `docker system prune -a --volumes` (⚠️ destructive) |
| **Slow queries** | Check active queries: `docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "SELECT * FROM pg_stat_activity;"` |
| **Missing indexes** | Verify indexes: `docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "\di"` |
| **Container won't start** | Check logs: `docker compose logs postgres` |
| **Data corruption** | Restore from latest backup (see Database Management) |

---

## 📦 Upgrading NexusCloud

```bash
# 1. Backup database first!
docker exec nexuscloud-postgres pg_dump -U nexuscloud nexuscloud > pre_upgrade_backup.sql

# 2. Pull latest code
git pull origin main

# 3. Rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d

# 4. Run any new migrations (if applicable)
docker exec nexuscloud-backend npm run db:migrate

# 5. Verify upgrade
curl http://localhost:5000/api/health
# Expected: {"status":"ok"}
```

---

## ⚡ Performance Tuning (PostgreSQL)

To optimize PostgreSQL for production, add these parameters to your `docker-compose.yml` under the `postgres` service:

```yaml
services:
  postgres:
    command: >
      postgres
      -c shared_buffers=256MB
      -c effective_cache_size=768MB
      -c maintenance_work_mem=64MB
      -c work_mem=12MB
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
```

**Recommended values by server RAM:**

| Server RAM | shared_buffers | effective_cache_size | maintenance_work_mem |
|------------|---------------|---------------------|---------------------|
| 2 GB | 256 MB | 768 MB | 64 MB |
| 4 GB | 1 GB | 3 GB | 128 MB |
| 8 GB | 2 GB | 6 GB | 256 MB |
| 16 GB | 4 GB | 12 GB | 512 MB |

---

## 🔒 Security Best Practices

- ✅ **Always change default passwords** in `.env` before exposing to network
- ✅ **Enable 2FA** for admin accounts (`ENABLE_2FA=true`, configure in UI)
- ✅ **Use HTTPS** behind reverse proxy (Nginx/Caddy/Traefik) with Let's Encrypt
- ✅ **Restrict CORS** — set `CORS_ORIGIN` to your specific domain, never `*` in production
- ✅ **Run containers as non-root** — add `user: "1000:1000"` to services in `docker-compose.yml`
- ✅ **Enable WebDAV only over HTTPS** — WebDAV transmits credentials in plaintext otherwise
- ✅ **Regular backups** — Automate `pg_dump` to offsite storage
- ✅ **Keep updated** — Run `docker compose pull` periodically for base image security patches
- ✅ **Rate limiting** — Enabled by default via `express-rate-limit` on auth endpoints
- ✅ **Helmet headers** — Security headers set by `helmet` middleware

---

## 📊 Monitoring & Logs

```bash
# View all container logs (follow)
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f postgres
docker compose logs -f frontend

# Check database size
docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "
  SELECT pg_size_pretty(pg_database_size('nexuscloud')) AS size;
"

# Monitor active connections
docker exec nexuscloud-postgres psql -U nexuscloud nexuscloud -c "
  SELECT count(*) AS active_connections FROM pg_stat_activity;
"

# Check storage usage
docker exec nexuscloud-backend df -h /app/uploads

# Resource usage per container
docker stats
```

---

## 🧹 Uninstalling

```bash
# Stop and remove containers (data persists)
docker compose down

# Stop and remove everything including data (⚠️ IRREVERSIBLE)
docker compose down -v

# Remove specific volume
docker volume rm nexuscloud_postgres_data
docker volume rm nexuscloud_uploads

# Clean up unused Docker resources
docker system prune -a
```

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes**
4. **Run tests** (`cd backend && npm test`)
5. **Run type checking** (`cd backend && npm run typecheck`)
6. **Commit** with clear message (`git commit -m 'Add amazing feature'`)
7. **Push** (`git push origin feature/amazing-feature`)
8. **Open a Pull Request**

### Code Style

- TypeScript strict mode enabled
- No `any` types — prefer explicit interfaces
- Backend routes use `express-async-errors` — no manual try/catch wrappers
- Frontend uses TailwindCSS utility classes (no CSS modules)
- Components follow functional + hooks pattern
- API responses follow `{ data, error }` envelope convention

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 💬 Support

- **GitHub Issues** — [https://github.com/yourusername/nexuscloud/issues](https://github.com/yourusername/nexuscloud/issues)
- **Documentation** — [https://docs.nexuscloud.com](https://docs.nexuscloud.com)
- **Discord Community** — [https://discord.gg/nexuscloud](https://discord.gg/nexuscloud)
