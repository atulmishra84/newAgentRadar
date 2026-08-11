# AgentRadar — Frontend Migration to React.js + TailwindCSS

## Overview

The current AgentRadar frontend is a **monolithic single-page application** built as a single `index.html` (4,075 lines) + `static/app.js` (8,119 lines). It uses vanilla HTML/CSS/JS with a custom design system using CSS custom properties (glassmorphism, light palette, gradient mesh background).

The goal is to migrate this to a **React.js + TailwindCSS** SPA that is visually pixel-perfect to the original, while making the codebase modular, maintainable, and scalable.

---

## Current Stack Analysis

### Architecture
| Concern | Current | Target |
|---------|---------|--------|
| Framework | Vanilla JS | React 18 + Vite |
| Styling | CSS custom properties in `<style>` | TailwindCSS v3 + CSS custom properties |
| Routing | Manual `go(view)` + DOM show/hide | React Router v6 |
| State | Global `DB` object + `localStorage` | Zustand (lightweight global store) |
| Build | None (served statically) | Vite dev server + production build |
| API client | `fetch()` inline | Axios with React Query (TanStack Query) |

### Views Identified (18 routes)
1. `dashboard` — Hero stats, alerts, risk/env/compliance bars, activity
2. `discovery` — Agent table with filters
3. `live` — Scanner grid + live log feed + fingerprint table
4. `shadow` — Shadow AI agents table
5. `phi` — PHI Exposure Monitor
6. `models` — Model Registry
7. `policy` — Policy Engine
8. `approvals` — Approval Workflow
9. `compliance` — Compliance Posture matrix
10. `playbooks` — Remediation Playbooks
11. `risk` — Risk & Analytics
12. `blast` — Global Mesh (SVG canvas)
13. `lineage` — Data Lineage Map (SVG canvas)
14. `integrations` — Environment Connect Hub
15. `ciso` — CISO Report
16. `benchmark` — Peer Benchmarking
17. `notifications` — Notifications list
18. `activity` — Activity Log
19. `admin` — Platform Administration (modals/settings)

### Modals / Overlays (kept as React components)
- Agent Drawer (slide-in detail panel)
- Add Agent Modal
- Add Policy Modal
- Scan Modal
- Bulk Import Modal
- Risk Acceptance Modal
- SLA Modal
- Webhooks Modal
- Session Timeout Warning
- MFA Modal
- Evidence Package Modal
- Shortcuts Panel
- Incident Response Modal
- Scheduled Reports Modal
- Retire Agent Modal
- Onboarding Wizard (4-step)
- AI Agent Panel (sliding chat panel)
- API Key Config Modal

### Design System to Preserve
All CSS custom properties from the original are converted to Tailwind config extensions:
- `--brand: #6366f1` → `brand: '#6366f1'` in Tailwind config
- Glassmorphism cards (backdrop-filter + rgba backgrounds)
- Gradient mesh animated background
- Plus Jakarta Sans + Bricolage Grotesque fonts
- Custom scrollbars

---

## Open Questions

> [!IMPORTANT]
> **Q1 – Tailwind Version**: This plan uses **TailwindCSS v3** (stable). Should we use v4 (alpha/stable as of 2026)?

> [!IMPORTANT]
> **Q2 – State Management**: The current app uses a global `DB` object with `localStorage` persistence. Should we keep `localStorage` as the persistence layer for now, or immediately wire everything to the backend API (`server.js`)?

> [!NOTE]
> **Q3 – Chart/Canvas views**: `blast` (Global Mesh) and `lineage` (Data Lineage Map) use raw SVG/canvas drawn imperatively. Should these be wrapped in React `useRef` + `useEffect` (preserving current drawing logic), or migrated to a library like `react-force-graph` / `d3`?

---

## Proposed Changes

### Phase 1 — Scaffold React + Vite App

#### [NEW] `apps/web/` — Vite + React app
```
apps/web/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css          ← global CSS (custom props, scrollbars, animations)
    ├── store/
    │   └── useStore.js    ← Zustand store (replaces global DB)
    ├── lib/
    │   ├── api.js         ← Axios client
    │   └── helpers.js     ← escapeHtml, rtag, envTag, etc.
    ├── components/
    │   ├── layout/
    │   │   ├── Sidebar.jsx
    │   │   ├── Topbar.jsx
    │   │   └── AppShell.jsx
    │   ├── ui/
    │   │   ├── StatCard.jsx
    │   │   ├── GlassCard.jsx
    │   │   ├── Badge.jsx
    │   │   ├── Button.jsx
    │   │   ├── FilterPill.jsx
    │   │   ├── SearchInput.jsx
    │   │   ├── Table.jsx
    │   │   ├── Modal.jsx
    │   │   └── Drawer.jsx
    │   └── overlays/
    │       ├── AIAgentPanel.jsx
    │       ├── OnboardingWizard.jsx
    │       ├── AgentDrawer.jsx
    │       ├── ScanModal.jsx
    │       ├── AddAgentModal.jsx
    │       ├── AddPolicyModal.jsx
    │       ├── ImportModal.jsx
    │       ├── RiskAcceptanceModal.jsx
    │       ├── SLAModal.jsx
    │       ├── WebhooksModal.jsx
    │       ├── MFAModal.jsx
    │       ├── EvidenceModal.jsx
    │       ├── IRModal.jsx
    │       ├── ScheduleModal.jsx
    │       ├── RetireModal.jsx
    │       ├── ShortcutsPanel.jsx
    │       └── SessionWarning.jsx
    └── pages/
        ├── Dashboard.jsx
        ├── Discovery.jsx
        ├── LiveDetection.jsx
        ├── ShadowAI.jsx
        ├── PHIExposure.jsx
        ├── ModelRegistry.jsx
        ├── PolicyEngine.jsx
        ├── Approvals.jsx
        ├── Compliance.jsx
        ├── Playbooks.jsx
        ├── Risk.jsx
        ├── GlobalMesh.jsx
        ├── DataLineage.jsx
        ├── Integrations.jsx
        ├── CISOReport.jsx
        ├── Benchmark.jsx
        ├── Notifications.jsx
        ├── ActivityLog.jsx
        └── Admin.jsx
```

---

### Phase 2 — Design System Bridge

#### [MODIFY] `apps/web/tailwind.config.js`
Extend Tailwind with the full design token set from the original CSS custom properties:
- Colors: brand, glass surfaces, semantic (red/amber/green/purple/blue)
- Text colors: primary, secondary, muted, ghost
- Border radius scale
- Custom box-shadow utilities for glassmorphism
- Font families: `display` (Bricolage Grotesque), `body` (Plus Jakarta Sans)

#### [MODIFY] `apps/web/src/index.css`
Keep global resets, animated gradient mesh background (`@keyframes mesh-drift`), custom scrollbar styles, `.view` transition animation, and any CSS that can't be expressed in Tailwind utilities.

---

### Phase 3 — State & Data Layer

#### [NEW] `apps/web/src/store/useStore.js`
A Zustand store that replicates the current `DB` global:
- `agents`, `risks`, `models`, `policies`, `approvals`, `notifications`, `activity`
- `currentView`, `typeFilter`, `envFilter`, `riskFilter`
- Persistence via `zustand/middleware/persist` → `localStorage`
- Actions: `addAgent`, `updateAgent`, `removeAgent`, `addPolicy`, `togglePolicy`, `addApproval`, `updateApproval`, `addNotification`, `markRead`, `addActivity`, `runScan`, `quarantine`

#### [NEW] `apps/web/src/lib/api.js`
Axios instance pointing to the existing `server.js` backend (`/api/*`). API calls are progressively adopted — initially the store is the source of truth, falling back to API if available.

---

### Phase 4 — Component Migration (Page by Page)

Each page component gets:
1. Tailwind classes replacing inline styles and custom CSS classes
2. React state (`useState`, `useMemo`) replacing manual DOM manipulation
3. Data from Zustand store replacing `DB` global reads
4. Event handlers as named functions instead of inline `onclick`

**Order of migration (risk-lowest first):**
1. Notifications, Activity → simple list renders
2. Dashboard → stat cards, bar charts
3. Discovery → filterable table
4. Shadow AI, PHI → filtered tables
5. Policy Engine, Approvals, Compliance → data grids with actions
6. Model Registry, Playbooks → card grids
7. Risk & Analytics → charts/bars
8. CISO Report, Benchmark → report layouts
9. Live Detection → real-time scanner grid + log feed (most complex)
10. Global Mesh, Data Lineage → Canvas/SVG wrappers
11. Integrations → tabbed wizard panels
12. Admin → toggle grids + tables

---

### Phase 5 — Routing

#### [NEW] React Router v6 setup in `App.jsx`
```
/ → redirect to /dashboard
/dashboard
/discovery
/discovery/live
/discovery/shadow
/discovery/phi
/discovery/models
/governance/policy
/governance/approvals
/governance/compliance
/governance/playbooks
/intelligence/risk
/intelligence/mesh
/intelligence/lineage
/integrations/connect
/reports/ciso
/reports/benchmark
/notifications
/ops/activity
/admin
```

The login screen and onboarding wizard are shown as full-screen overlays (not routes), exactly as today.

---

### Phase 6 — Nginx & Docker Integration

#### [MODIFY] `nginx.conf`
Update to serve the Vite build from `apps/web/dist/` instead of root-level `index.html`. Preserve `/api/*` proxy pass to `server.js`.

#### [MODIFY] `docker-compose.yml`
Add Vite build step or a dedicated `web` service that builds and serves the React app.

---

## Verification Plan

### Automated
```bash
# Install and build
cd apps/web && npm install && npm run build

# Lint
npm run lint

# Type check (if TypeScript added)
npm run type-check
```

### Manual Visual Verification
For each of the 18+ pages, verify:
- [ ] Visual layout matches the original pixel-for-pixel
- [ ] Glassmorphism cards render correctly
- [ ] Gradient mesh background animates
- [ ] All modals open/close properly
- [ ] Filters and search work as expected
- [ ] Navigation sidebar shows active states
- [ ] AI Agent panel slides in/out
- [ ] Live scanner log feed animates
- [ ] Global Mesh SVG renders
- [ ] Data Lineage Map renders
- [ ] Login screen appears on fresh load

### Regression Checks
- [ ] localStorage data persists across page refresh
- [ ] API calls to `/api/*` still work (agents CRUD, auth, etc.)
- [ ] Docker compose `up` works with the new build
