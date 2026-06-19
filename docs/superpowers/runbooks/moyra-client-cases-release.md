# Moyra Client Cases Release Runbook

**Scope**: Controlled release for the private `Casos` module built across Sprints 0-9.

**Current release posture**: Do not enable broadly until the automated checks pass, the test environment smoke is captured, and the remaining activation gates are explicitly resolved or deferred.

## Release Gates

- Frontend and backend branches are clean except for the intended release commits.
- Backend cases API tests, CDK synth, and audits have been captured.
- Frontend build, unit tests, and audits have been captured.
- Public Publications routes and public aggregate APIs have been smoke-tested.
- `CASES_FEATURE_ENABLED` is enabled only in the intended environment.
- `CASE_EMAIL_NOTIFICATIONS_ENABLED` stays disabled until the SES identity, sender, and DNS plan are confirmed.
- `CASE_WEB_PUSH_ENABLED` stays disabled until VAPID private-key storage and runtime configuration are finished.
- Client file-upload rollout acknowledges that malware scanning is not implemented in this MVP.
- Hugo/Alec approve controlled test release before production promotion.

## Feature Flags

Backend flags:

- `CASES_FEATURE_ENABLED`: master server-side gate for private case routes.
- `CASE_CLIENT_UPLOADS_ENABLED`: enables client document upload workflow.
- `CASE_INVITES_ENABLED`: enables case-scoped email invitations.
- `CASE_EMAIL_NOTIFICATIONS_ENABLED`: enables SES delivery for safe case summaries.
- `CASE_EMAIL_FROM`, `CASE_EMAIL_REPLY_TO`, `CASE_EMAIL_IDENTITY_ARN`: SES sender and scoped identity settings; keep unset unless email delivery is enabled.
- `CASE_APP_BASE_URL`: base URL used in authenticated case links.
- `CASE_WEB_PUSH_ENABLED`: enables Web Push subscription writes and sender delivery.

Frontend flags:

- `casesFeatureEnabled`: shows private case navigation and allows `CasesGuard`.
- `caseFeatureEnabledHosts`: host allowlist for controlled environments when `casesFeatureEnabled` stays false globally.
- `caseServiceWorkerEnabled`: registers Angular service worker support.
- `caseWebPushPublicKey`: browser VAPID public key; keep empty unless Web Push is enabled.

Controlled test rollout posture:

- Backend `test`: set `CASES_FEATURE_ENABLED=true`, `CASE_CLIENT_UPLOADS_ENABLED=true`, `CASE_INVITES_ENABLED=true`, `CASE_EMAIL_NOTIFICATIONS_ENABLED=false`, `CASE_WEB_PUSH_ENABLED=false`, and `CASE_APP_BASE_URL=https://test.moyra.org`.
- Frontend `test`: keep `casesFeatureEnabled=false` globally and allow only `test.moyra.org` through `caseFeatureEnabledHosts`.
- Production: keep `casesFeatureEnabled=false` and do not add production hosts until test smoke is approved.

Rollback flag posture:

- Disable `CASES_FEATURE_ENABLED` first to fail closed at the API boundary.
- Disable `casesFeatureEnabled` to remove the visible UI entry points.
- Disable `CASE_EMAIL_NOTIFICATIONS_ENABLED` and `CASE_WEB_PUSH_ENABLED` independently if only notification delivery is unhealthy.
- Set `caseServiceWorkerEnabled=false` and `caseWebPushPublicKey=''` if Web Push is rolled back.

## Preflight Commands

Frontend, from `C:\Users\lince\Documents\GitHub\moyra-front-angular`:

```powershell
npm run build
npx ng test --watch=false --browsers=ChromeHeadless --no-progress
npm audit --omit=dev --audit-level=moderate
npm audit --audit-level=moderate
git diff --check
```

Known frontend audit posture before release:

- Production dependency audit with `--omit=dev` should return no vulnerabilities.
- Full audit may still report Angular 21 toolchain transitive findings with no fix available. Record the exact output from the current run.

Backend, from `C:\Users\lince\Documents\GitHub\moyra-infra-serverless`:

```powershell
node --test --test-force-exit test\apiLambda.test.js
node --test --test-force-exit test\cdkStack.test.js
npm run cdk:synth
npm audit --audit-level=moderate
npm audit --audit-level=moderate --prefix infra\lambda\api
git diff --check
```

Known backend audit posture before release:

- API Lambda dependency audit should return no vulnerabilities.
- Root audit should return no vulnerabilities after `aws-cdk-lib@2.260.0` and `aws-cdk@2.1128.0`. Record the exact output from the current run.

## Backend Deployment

Use the existing backend GitHub Actions workflow `serverless-backend.yml`.

Test deploy:

1. Run workflow dispatch with `stageName=test`.
2. Preserve the existing environment variables for custom domain, certificate, CORS origins, notification emails, and Bedrock settings.
3. The workflow exposes Cases release settings through GitHub Environment variables and passes them into CDK.
4. Do not pass Web Push VAPID private keys through workflow variables or CDK context; keep `CASE_WEB_PUSH_ENABLED=false` until secure runtime secret handling is designed.
5. If a one-off CDK deploy is used instead, pass explicit context values and record the command in `Codex.md`.

Production deploy:

1. Promote only after test smoke passes.
2. Preserve production custom-domain context for `api.moyra.org`.
3. Keep SES and Web Push disabled unless their activation gates have been closed.
4. Do not add AWS WAF as part of this release without explicit approval.

Route verification examples:

```powershell
aws apigatewayv2 get-routes --api-id <api-id> --query "Items[?contains(RouteKey, '/api/v2/cases') || contains(RouteKey, '/api/v2/case-notifications') || contains(RouteKey, '/api/v2/case-push-subscriptions')].[RouteKey,Target]" --output table
aws apigatewayv2 get-integrations --api-id <api-id> --query "Items[*].[IntegrationId,IntegrationUri]" --output table
```

Expected route-family shape:

- Cases routes target `moyra-<stage>-cases-api`.
- Public site routes keep targeting `moyra-<stage>-public-site-api`.
- The monolith rollback Lambda `moyra-<stage>-api` remains deployed.
- Do not collapse routes back to the monolith unless the rollback is explicitly chosen.

Previously verified API ids documented in repo memory:

- Test: `w7vvxs7fs0`
- Production: `9d4vviz13b`

Re-check current AWS output during the release; do not assume these ids are unchanged without verification.

## Frontend Deployment

This frontend repo currently has no `.github/workflows` directory. Use the existing branch/Dokploy promotion path documented in `Codex.md` unless a new deployment workflow is created separately.

- Testing frontend tracks branch `test`.
- Production frontend tracks branch `production`.
- Test first, then production only after smoke evidence is captured.

Keep these defaults until activation is approved:

```ts
casesFeatureEnabled: false
caseFeatureEnabledHosts: ['test.moyra.org'] // test build only
caseServiceWorkerEnabled: false
caseWebPushPublicKey: ''
```

## Public Surface Smoke

Run after backend deploy and again after frontend deploy:

- `GET https://api.test.moyra.org/api/v2/health`
- `GET https://api.test.moyra.org/api/v2/site`
- `GET https://api.test.moyra.org/api/v2/publications`
- `GET https://test.moyra.org/`
- `GET https://test.moyra.org/publications`
- `GET https://test.moyra.org/blog`
- `GET https://test.moyra.org/soluciones`

Verify public responses do not include:

- Case ids, case references, case titles, member emails, comments, entry body text, private filenames, or notification payloads.
- Private routes in sitemap or public SEO metadata.
- Authenticated case links in unauthenticated public content.

Repeat equivalent checks for production domains after production promotion.

## Private Cases Smoke

Use at least:

- One attorney/admin.
- One pasante-like internal collaborator.
- Two external client users.
- At least two cases, including one external client with access to multiple cases.

Negative checks:

- Logged-out user cannot list or open cases.
- Non-member cannot open guessed case id.
- Removed member cannot read, comment, upload, receive notifications, or download.
- External client cannot see another client's case.
- External client cannot approve files, manage members, manage permissions, or read audit events.
- Pending external file is visible to internal users but hidden from other external members.

Positive checks:

- Admin/internal user can create case, set attorney-defined status, add entry, invite member, approve file visibility, and read audit events according to permissions.
- Client with membership can list only assigned cases, read authorized entries, comment, upload documents, download authorized files, and see in-app notifications.
- Client with multiple cases sees those cases separately.
- Notification center read/read-all updates unread counts.
- Email and Web Push are tested only if their flags and configuration are enabled.

## Browser Visual QA

Run at desktop and mobile widths:

- `/casos`
- `/casos/:caseId`
- `/casos/:caseId/entrada/:entryId`
- `/notificaciones`
- `/notificaciones/preferencias`
- `/admin/casos`
- `/admin/casos/:caseId`
- `/admin/casos/configuracion`

Check:

- No overlapping text, buttons, forms, document lists, badges, or fixed chrome.
- Header/footer do not cover content.
- Tables and toolbars keep stable dimensions.
- Empty, loading, and error states are usable.
- Browser console has no uncaught errors during normal workflows.

## Notification Activation Notes

SES:

- Use a controlled Moyra sending identity or subdomain.
- Preserve Microsoft 365 MX and mailbox records.
- Prefer a sending subdomain if DNS ownership or Microsoft mail flow could be affected.
- Keep email templates to safe summaries and authenticated links.

Web Push:

- Do not store VAPID private keys in frontend environment files.
- Enable only after backend runtime secret handling is configured.
- Test expired subscriptions and service worker update behavior before production.

## Rollback

Fast rollback:

1. Set `CASES_FEATURE_ENABLED=false`.
2. Set `CASE_EMAIL_NOTIFICATIONS_ENABLED=false`.
3. Set `CASE_WEB_PUSH_ENABLED=false`.
4. Set frontend `casesFeatureEnabled=false`, `caseServiceWorkerEnabled=false`, and `caseWebPushPublicKey=''`.
5. Redeploy backend and frontend through the same release path.
6. Verify logged-out and member users cannot reach cases routes.
7. Verify public routes still return expected content.

Route-family rollback:

- The monolith backup Lambda remains available.
- Use `-c useMonolithApiRoutes=true` or `USE_MONOLITH_API_ROUTES=true` only if a route-family rollback is explicitly chosen.
- Route-family rollback affects more than Cases traffic, so prefer feature-flag rollback first.

Data rollback:

- Do not delete case tables or uploaded case files during application rollback.
- Preserve audit events and notifications for investigation.
- If a bad notification fanout occurred, disable notification delivery first and inspect records before deleting any data.

## Evidence To Capture

Record in `Codex.md`:

- Commit SHAs for frontend and backend.
- Exact validation command outputs.
- GitHub Actions run ids or manual deploy command.
- API Gateway route verification output.
- Public smoke URLs and statuses.
- Private smoke users and role matrix, without passwords or secrets.
- Activation decisions for SES, Web Push, and client-upload scanning.
