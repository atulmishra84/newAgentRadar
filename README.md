# AgentRadar

**Your CMDB for AI agents.**

Enterprise AI Agent Discovery & Governance Platform for healthcare and enterprise organizations.

**Tagline:** Know every agent, model, edge, and runtime in motion.

## Positioning

AgentRadar is the system of record for AI agents — inventoring sanctioned and shadow agents across cloud, SaaS, healthcare, and endpoints so you can risk-score, enforce, and prove compliance.

**30-day land path (first-wave):** Azure · Microsoft Entra · CrowdStrike / Intune / Defender · GitHub · Epic · M365 Copilot.

## Stack

- React 18 + Vite (`apps/web`)
- Node 20 + Express (`apps/api`)
- PostgreSQL 15 + Redis 7
- Nginx TLS termination + Docker Compose BYOC

## Quick start (local)

```bash
cp .env.example .env
docker compose up -d postgres redis
# Host ports: Postgres 5433, Redis 6380 (see .env)
npm install
npm run migrate
npm run seed
npm run dev:api   # :4000
npm run dev:web   # :5173
```

Demo logins:

| Email | Password | Role |
|---|---|---|
| admin@acme.health | Admin123! | platform_admin |
| ciso@acme.health | Ciso123! | ciso |
| analyst@acme.health | Analyst123! | analyst |
| auditor@acme.health | Auditor123! | auditor |
| viewer@acme.health | Viewer123! | viewer |

## Docker Compose (full stack)

```bash
cp .env.example .env
# generate certs if needed: openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout certs/key.pem -out certs/cert.pem -subj "/CN=localhost"
docker compose up --build
```

Open `https://localhost` (self-signed cert).

## Capabilities

1. First-wave discovery wedge (Azure/Entra/EDR/GitHub/Epic) with demo vs live labeling
2. Stable agent fingerprints (system-of-record identity)
3. Agent Passport inventory & classification (11 categories)
4. Shadow AI approve/quarantine with enforcement webhooks (ServiceNow/Zscaler/EDR/Entra)
5. PHI / HIPAA / BAA governance + estate evidence packages
6. Tunable risk weights + risk acceptance with expiry
7. Policy engine, compliance frameworks, playbooks
8. Coverage map with connect CTAs
9. SSO & IAM (Entra OIDC, role mapping, MFA gates for admin/CISO)
10. CISO report + PDF
11. Model registry & operations workbench

## Security

- HTTPS / HSTS (nginx)
- JWT httpOnly cookies + Bearer
- CSRF double-submit on mutations
- Redis rate limiting on auth
- Server-authoritative RBAC (5 roles)
- Encrypted connector credentials (AES-256-GCM)
- Immutable `admin_audit_log`
- Optional Microsoft Entra OIDC with claim→role mapping (`ENTRA_*`)
- TOTP MFA enroll/challenge; optional enforce for admin/CISO (`MFA_ENFORCE=true`)
- Optional SIEM webhook forward (`SIEM_WEBHOOK_URL`)
- Structured request logs + `/api/metrics`; optional scheduled discovery (`DISCOVERY_INTERVAL_MS`)

## Docs

- [BYOC deployment](docs/BYOC.md)
- [Security posture](docs/SECURITY.md)

Standalone UI prototype: `prototype.html`
