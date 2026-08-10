# Security Posture

| Control | Implementation |
|---|---|
| HTTPS / HSTS | nginx `Strict-Transport-Security` |
| CSRF | Double-submit cookie `ar_csrf` + `X-CSRF-Token` |
| XSS | React escaping; CSP headers via nginx |
| Auth | JWT (httpOnly cookie + Bearer), bcrypt passwords |
| MFA | TOTP enroll/challenge; optional `MFA_ENFORCE` for admin/CISO |
| RBAC | `platform_admin`, `ciso`, `analyst`, `auditor`, `viewer` — enforced server-side |
| Rate limit | Redis sliding window on `/api/auth/login` |
| Secrets | Connector credentials AES-256-GCM; never returned to browser |
| Audit | Append-only `admin_audit_log` (UPDATE/DELETE rules) |
| SSO | Microsoft Entra OIDC + SAML 2.0 SP (metadata/ACS) with claim→role mapping |
| PHI inspection | Metadata/content pattern scan (not EHR record access) |
| Tenancy | Multi-tenant control plane with platform operators; BYOC-friendly |
| Data residency | Deploy in customer cloud; tenant isolation via `tenant_id` |

## PHI inspection scope

AgentRadar inspects **agent metadata** (names, data stores, protocols, tags) for PHI indicators such as MRN/SSN-like strings and clinical system references. It does **not** connect to EHR patient charts or dump clinical payloads.
