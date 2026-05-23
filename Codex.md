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
- The global site brand/header is visual identity only and must not use `h1`/`h2`; each routed page owns its own document heading hierarchy.
- Header and footer remain fixed; `.site-main` is the scroll container between them so visible content does not sit under fixed chrome.
- Rich text editing is shared through the Quill-based rich text editor. Long-form content should preserve headings, emphasis, links, lists, quotes, YouTube embeds, and safe insertions.
- Publications and home should reuse the same publication-card presentation where practical.
- Local embed QA should run under `localhost`, not `127.0.0.1`; some YouTube privacy embeds show unavailable under `127.0.0.1`. The browser entry redirects `127.0.0.1` to `localhost` for local development.

## Security Notes

- Never store passwords in the frontend or in repo documentation.
- Session extension is handled by the serverless API using a host-only `moyraRefreshToken` HttpOnly/Secure/SameSite=None cookie scoped to `/api/v2/auth`.
- `POST /api/v2/auth/refresh` rotates short-lived Cognito access/id tokens from the cookie.
- `POST /api/v2/auth/logout` clears the refresh cookie.
- Refresh/logout must reject untrusted browser origins through `ALLOWED_CORS_ORIGINS`.
- Localhost/127 frontend sessions against the remote API should not use credentialed auth cookies. The browser can block login when the API lacks `access-control-allow-credentials`; local development should authenticate with the returned token and skip refresh-cookie calls.
- Secure external iframes are allowed only through validated insertion fields, not arbitrary rich HTML. Use `SafeEmbedFrameComponent` with static iframe `allow`/`sandbox` branches; Angular strips/blocks dynamic bindings for these iframe attributes at runtime.
- YouTube embeds should keep the privacy host (`youtube-nocookie.com`) and should not render with a `sandbox` attribute. Keep sandboxing on approved non-YouTube iframes such as Google Forms.
- AI usage dashboards should avoid background Cost Explorer polling. Use cached AWS cost snapshots and lazy refresh only when `/admin/uso` is opened after the configured interval expires. Hide AWS services with effectively zero cost and show computed base estimates separately from Cost Explorer.
- Phase 2 AI cost tracking uses `/admin/uso` plus `AiUsageService`. The assistant should show monthly token usage against the backend-provided `BEDROCK_MONTHLY_TOKEN_BUDGET`. Current Bedrock generation may still return `BEDROCK_TOKEN_QUOTA_EXCEEDED` when the AWS account exhausts its daily/temporary token quota.
- The shared `AiAssistantPanelComponent` is the admin-facing first pass for Blog, Publicaciones, Soluciones, and Configuraciones. It generates editable suggestions only; it must not auto-save or auto-publish generated text.
- Real AI generation uses Amazon Bedrock Runtime through the Lambda IAM role. Optional environment control: `BEDROCK_DEFAULT_MODEL_ID`. No OpenAI API key is needed for the Bedrock first pass.
- Web research is intentionally disabled and hidden in the Bedrock first pass. To add internet research later, document and integrate OpenAI web search, Tavily, SerpAPI, Bedrock Agents/tool use, or another search provider with separate cost tracking.

## Deployment Baseline

- Testing frontend tracks branch `test`.
- Production frontend tracks branch `production`.
- Serverless infra deploys through `moyra-infra-serverless` GitHub Actions workflow `serverless-backend.yml`.
- For infra deploys that depend on custom domains, preserve the per-environment domain/certificate/CORS variables; do not assume a deploy without custom-domain props keeps the published DNS target intact.

## Latest Verified State

- 2026-05-23 CT test rollout: frontend commit `aff3e87` was pushed to `test`; infra commit `4ad588d` deployed to `MoyraCloud-test` through GitHub Actions run `26327079939`. Backend health returned 200, stack status was `UPDATE_COMPLETE`, and Lambda env showed `BEDROCK_MAX_OUTPUT_TOKENS=1800`, `BEDROCK_MONTHLY_TOKEN_BUDGET=300000`, `BEDROCK_USE_CROSS_REGION_INFERENCE=false`, and default model `amazon.nova-micro-v1:0`.
- 2026-05-23 CT browser audit on `https://test.moyra.org`: `/admin/uso` hid web research, hid zero-cost AWS rows, showed period total, `AWS Secrets Manager (test, estimado base) USD 0.40`, and showed the 300,000 monthly token budget. `/admin/publications` linked `Editar publicación` to `/admin/publication/Test-post?edit=true`, and that route opened directly in editor mode with the AI assistant and model dropdown. A test generation still returned the friendly `BEDROCK_TOKEN_QUOTA_EXCEEDED` message, so AWS Bedrock quota approval remains the blocker for real generation.
- Frontend commit `369eb87` is deployed to both testing and production branches.
- Infra commit `607d9b8` is deployed to testing and production.
- Testing refresh smoke passed: `https://api.test.moyra.org/api/v2` health 200, credentialed CORS for `https://test.moyra.org`, login/admin refresh 200, missing cookie 401, untrusted origin 403, and `/admin/publications` stayed authenticated after reload with no console warning/error logs.
- Production refresh smoke passed: `https://api.moyra.org/api/v2` health 200, credentialed CORS for `https://moyra.org`, login/admin refresh 200, missing cookie 401, untrusted origin 403, and `/admin/publications` stayed authenticated after reload with no console warning/error logs.
