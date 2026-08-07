# BYOC Deployment

AgentRadar is designed for Bring-Your-Own-Cloud: customer data stays in the customer tenant.

## Prerequisites

- Docker + Docker Compose
- TLS certificates in `certs/cert.pem` and `certs/key.pem`
- Strong `JWT_SECRET` and 64-hex `ENCRYPTION_KEY`

## Deploy

```bash
cp .env.example .env
# edit secrets, set COOKIE_SECURE=true, APP_URL=https://your-host
docker compose up --build -d
```

Services:

| Service | Role |
|---|---|
| postgres | System of record |
| redis | Rate limit + scan state |
| api | Express API + SPA static |
| nginx | HTTPS termination, HSTS, SPA/API proxy |

## Entra SSO

Set:

```
ENTRA_TENANT_ID=
ENTRA_CLIENT_ID=
ENTRA_CLIENT_SECRET=
ENTRA_REDIRECT_URI=https://your-host/api/auth/entra/callback
```

Register the redirect URI in the Entra app registration. Users are JIT-provisioned as `viewer` if unknown (configurable per tenant). Map Entra claims to AgentRadar roles under **SSO & IAM**.

Set `MFA_ENFORCE=true` to require MFA enrollment for `platform_admin` and `ciso` before password login succeeds.

## First-wave connectors

Land with Azure, Entra SSO, CrowdStrike/Intune/Defender, GitHub, Epic, and M365. Connectors are labeled **demo** (simulated scanner) or **live** (real API). Set `DISCOVERY_DEMO_MODE=false` and provide credentials for live-capable providers.

## Azure discovery

Provide `AZURE_*` or connector credentials via the Integrations UI. ARM resources matching AI resource types are ingested into Agent Passport records with stable fingerprints.

## Enforcement webhooks

Configure ServiceNow / Zscaler / EDR / Entra webhooks under **Enforcement**. Approve and quarantine actions deliver signed JSON payloads with provider-specific action hints.

## SIEM forward

Set `SIEM_WEBHOOK_URL` to receive JSON events for login, approve, and quarantine actions.
