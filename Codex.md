# Codex Agent Memory

This file is for durable agent memory only. Dated implementation history belongs in `changelogs/`; exploratory notes, audit caveats, and follow-up ideas belong in `ia-notes/`.

## Product Direction

- Moyra UI should stay rectilinear: no rounded borders. Shadows are acceptable when they support restrained glassmorphism or elevation.
- Public/admin screens should feel like a legal operations tool: clear hierarchy, dense but readable information, direct controls, and no marketing-style filler.
- Use the Moyra/MRA logo for browser and touch icons.

## Frontend Architecture

- Angular app with serverless API v2 routing from `src/app/services/global.ts`.
- Admin authentication is centralized in `src/app/store/auth/` using NgRx store/effects.
- Admin guards must not trust raw `localStorage` identity. They derive admin access from validated Cognito claims and should redirect to login with `returnUrl` when auth fails.
- Rich text editing is shared through the Quill-based rich text editor. Long-form content should preserve headings, emphasis, links, lists, quotes, YouTube embeds, and safe insertions.
- Publications and home should reuse the same publication-card presentation where practical.

## Security Notes

- Never store passwords in the frontend or in repo documentation.
- Session extension is handled by the serverless API using a host-only `moyraRefreshToken` HttpOnly/Secure/SameSite=None cookie scoped to `/api/v2/auth`.
- `POST /api/v2/auth/refresh` rotates short-lived Cognito access/id tokens from the cookie.
- `POST /api/v2/auth/logout` clears the refresh cookie.
- Refresh/logout must reject untrusted browser origins through `ALLOWED_CORS_ORIGINS`.
- Secure external iframes are allowed only through validated insertion fields, not arbitrary rich HTML.
- AI usage dashboards should avoid background Cost Explorer polling. Use cached AWS cost snapshots and lazy refresh only when `/admin/uso` is opened after the configured interval expires.

## Deployment Baseline

- Testing frontend tracks branch `test`.
- Production frontend tracks branch `production`.
- Serverless infra deploys through `moyra-infra-serverless` GitHub Actions workflow `serverless-backend.yml`.
- For infra deploys that depend on custom domains, preserve the per-environment domain/certificate/CORS variables; do not assume a deploy without custom-domain props keeps the published DNS target intact.

## Latest Verified State

- Frontend commit `369eb87` is deployed to both testing and production branches.
- Infra commit `607d9b8` is deployed to testing and production.
- Testing refresh smoke passed: `https://api.test.moyra.org/api/v2` health 200, credentialed CORS for `https://test.moyra.org`, login/admin refresh 200, missing cookie 401, untrusted origin 403, and `/admin/publications` stayed authenticated after reload with no console warning/error logs.
- Production refresh smoke passed: `https://api.moyra.org/api/v2` health 200, credentialed CORS for `https://moyra.org`, login/admin refresh 200, missing cookie 401, untrusted origin 403, and `/admin/publications` stayed authenticated after reload with no console warning/error logs.
