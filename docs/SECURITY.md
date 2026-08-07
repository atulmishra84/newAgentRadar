# Security Posture

| Control | Implementation |
|---|---|
| HTTPS / HSTS | nginx `Strict-Transport-Security` |
| CSRF | Double-submit cookie `ar_csrf` + `X-CSRF-Token` |
| XSS | React escaping; CSP headers via nginx |
| Auth | JWT (httpOnly cookie + Bearer), bcrypt passwords |
| RBAC | `platform_admin`, `ciso`, `analyst`, `auditor`, `viewer` — enforced server-side |
| Rate limit | Redis sliding window on `/api/auth/login` |
| Secrets | Connector credentials AES-256-GCM; never returned to browser |
| Audit | Append-only `admin_audit_log` (UPDATE/DELETE rules) |
| SSO | Microsoft Entra OIDC (optional) |
| Data residency | BYOC — single-tenant deploy in customer cloud |

## Non-goals (documented)

- Content/payload PHI inspection (metadata flags only)
- Multi-tenant SaaS shared data plane
