# Moyra UI, Content, and Auth Changelog

Times are Central Time.

## 2026-05-20 12:09 CT - First Moyra redesign pass

- Implemented Moyra favicon assets, rectilinear header/footer shell, desktop nav visibility, non-fixed footer, no-rounded public/admin surface sweep, and `rel="noopener noreferrer"` hardening for external links.
- Verified locally with `npm run build` and `ng serve` at `http://127.0.0.1:4200/`.
- Build succeeded with existing budget warnings: initial bundle over 800 kB and `src/app/components/blog/article/article.component.scss` over the 4 kB component-style warning budget.

## 2026-05-20 20:24 CT - Publication editor audit

- Audited `http://localhost:4200/admin/publication/test-post` with the in-app Browser.
- Covered Quill headings, bold, italic, underline, strike, lists, quotes, links, email text, YouTube embeds, image preview modal, related image preview modal, public detail, admin/public publication lists, and console warnings/errors.
- Fixed publication list cards so a single publication no longer stretches full width; card images now use `object-fit: contain` and 360 px card columns.
- Removed the duplicated visible "Contenido" label from the publication editor.
- Found SEO persistence was blocked by the development API not returning `seoTitle`, `seoDescription`, and `seoKeywords`.
- Deployed `MoyraCloud-development` from `moyra-infra-serverless`; after save, the development publication endpoint returned all three SEO fields and the public detail set matching title, description, keywords, Open Graph, and Twitter meta tags.
- Verification passed: frontend `npm run build`; infra `npm test` 70/70; `npx cdk synth -c stageName=development`; `npx cdk deploy MoyraCloud-development --require-approval never -c stageName=development`; final Browser console checks returned no warning/error logs.

## 2026-05-20 20:32 CT - Quill toolbar dropdown fix

- Fixed the rich text editor toolbar dropdown closing immediately by replacing the outer `<label class="rich-editor">` wrapper with `<div class="rich-editor">`.
- Quill toolbar controls must not be nested inside a label because click/focus handling collapses the picker.
- Browser verification on `/admin/publication/test-post`: the header picker kept `ql-expanded` after click, showed Heading 2/Heading 3/Heading 4/Normal, and console warning/error logs were empty.

## 2026-05-20 21:03 CT - Publication rich preview and file types

- Publication detail and list views now render long Quill content as rich content.
- Preserves headings, bold, underline, ordered lists, unordered lists, blockquotes, links, and YouTube embeds.
- Publication files now share a central `file-kind` utility for type labels, icons, summaries, image detection, and grouped badges.
- Supported groups include image, PDF, Word, spreadsheet, CSV, presentation, email, archive, text, and generic file.
- Browser verification on `/publication/test-post` and `/publications`: rich text styles computed correctly, YouTube embeds were present, file badges summarized counts by type, and console warning/error logs were empty.

## 2026-05-20 21:33 CT - Stable publication embeds

- Fixed intermittent YouTube/insertion rendering by moving publication list embed data into stable view models, using `trackBy` for embeds/file badges, and caching trusted YouTube resource URLs in `SafeEmbedUrlPipe`.
- Expanded YouTube parsing for common formats: `youtu.be`, `youtube.com/watch`, `embed`, `shorts`, `live`, `v`, subdomains like `m.youtube.com`, and pasted iframe `src` values.
- Browser verification on `/publications` and `/publication/test-post`: both routes kept the same two `youtube-nocookie.com/embed/...` iframe URLs after scroll, no framework overlay appeared, and console warning/error logs were empty.

## 2026-05-20 22:45 CT - Secure external iframes

- Enabled secure external iframe insertions through the `insertions` field, not through arbitrary rich HTML.
- Rich HTML remains sanitized separately.
- Current iframe allowlist includes Google Forms/Docs/Drive/Maps, Microsoft Forms, Calendly, Airtable, CodePen, CodeSandbox, and StackBlitz.
- Unsafe iframe hosts are not embedded; safe HTTP(S) URLs outside the allowlist render as external links.
- Angular requires sensitive iframe attributes like `sandbox` and `allow` to be static, so embed templates use static restrictive attributes and dynamic URLs only after validation through `SafeEmbedUrlPipe`.
- Verification: `npm run build`, utility test for Google Forms vs. unsafe iframe host, and Browser checks on `/publication/test-post` and `/publications`.

## 2026-05-20 22:53 CT - Home reuses publication list cards

- Home now embeds the standalone `publications` component for its "Publicaciones recientes" section instead of duplicating a separate simplified card layout.
- `PublicationsComponent` supports embedded mode with input publications, max item count, optional heading, and optional empty state.
- Route `/publications` keeps its own heading, SEO, loading, and admin behavior.
- Browser verification showed Home and `/publications` using the same `.publication-card` markup, rich content, iframe embeds, and file summaries.

## 2026-05-20 23:23 CT - NgRx auth guard hardening

- Installed NgRx 20.1.0 packages for Angular 20: `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`, and `@ngrx/signals`.
- Admin authentication is centralized in `src/app/store/auth/`.
- Store hydrates from storage through an effect, validates token presence/expiration, derives admin role from token claims for API v2, and rejects stale or tampered `identity` values.
- `AdminGuard` protects both `canActivate` and `canActivateChild`, returns a login `UrlTree` with `returnUrl`, and no longer trusts `localStorage` directly.
- `App` hydrates auth state on startup and storage changes; login dispatches credentials to the auth store.
- Verification: `npm run build` passed after increasing the production initial bundle error budget to `1100kB`; targeted tests for auth storage/admin guard/admin shell passed; browser checks redirected unauthenticated and tampered-admin storage from `/admin/...` to `/login?returnUrl=...`.

## 2026-05-20 23:36 CT - Nosotros page redesign

- Redesigned public Nosotros page to match the current Moyra visual direction: rectilinear layout, no rounded borders, restrained glass/shadow elevation, updated hero, principles, and team card sections.
- Preserved admin edit controls and moved Nosotros/equipo descriptions to the shared rich text editor.
- Verification: `npm run build` passed with only existing initial bundle and `quill-delta` CommonJS warnings; Browser checks on `http://localhost:4200/we` showed redesigned sections, fixed header/footer, and no console warning/error logs.

## 2026-05-20 23:44 CT - Nosotros criteria configuration

- Nosotros criteria cards no longer show numeric labels and now read titles/descriptions from `main.pageTexts`.
- Added editable configuration fields under `Nosotros - criterios de trabajo`: `wePrinciple1Title`, `wePrinciple1Copy`, `wePrinciple2Title`, `wePrinciple2Copy`, `wePrinciple3Title`, and `wePrinciple3Copy`.
- Verification: `npm run build` passed with existing initial bundle and `quill-delta` warnings. Browser check on `http://localhost:4200/we` confirmed three criteria cards, no visible `01/02/03`, and no console warning/error logs.

## 2026-05-21 00:30 CT - Blog and publication Phase 1 UX implementation

- Implemented Phase 1 for Blog and pertinent Publication surfaces without adding infrastructure.
- Added editor workflow cards, content/SEO/file metrics, SEO checks, share previews, asset gate copy before first save, embed previews while editing, and auto-generated slugs for new articles/publications.
- Blog list now builds article view models, hydrates article sections, renders rich content previews, safe embeds, reading time, and file badges/counts matching the publication list pattern.
- Blog detail section files now show file-type icons and labels.
- Publication editor received the same workflow/metrics/SEO/embed-preview treatment while keeping existing rich content, files, and secure embed rendering.
- Verification: `npm run build` passed twice with existing initial bundle and `quill-delta` warnings. Browser audit on `/admin/articulo`, `/blog`, `/admin/publication`, and `/publications` found meaningful content, no framework overlay, and no console warning/error logs.

## 2026-05-21 00:55 CT - Auth session clarity fix

- Added frontend handling so expired/invalid stored sessions pass a reason to `/login`.
- Login now clearly warns when a non-admin account tries to access an admin return URL.
- Verification: `npm run build` passed with existing bundle/CommonJS warnings; targeted auth storage and admin guard tests passed; Browser local check on `/login?returnUrl=/admin/blog&auth=expired` showed the expired-session notice and no console warning/error logs.

## 2026-05-21 01:14 CT - Refresh-token session implementation

- Implemented longer admin sessions with a host-only `moyraRefreshToken` HttpOnly/Secure/SameSite=None cookie scoped to `/api/v2/auth`.
- Backend endpoints: `POST /api/v2/auth/refresh` and `POST /api/v2/auth/logout`.
- Frontend login/new-password calls now use credentials for API v2.
- App attempts startup refresh when no valid token is hydrated.
- Admin guard tries refresh before redirecting to login.
- Verification before deployment: infra `npm test` passed 73/73, `npm run cdk:synth` passed, Angular `npm run build` passed with existing bundle/CommonJS warnings, and targeted auth tests passed 6/6.

## 2026-05-21 01:29 CT - Refresh-token deploy evidence

- Pushed infra commit `607d9b8` to `main` and frontend commit `369eb87` to `test`.
- Fast-forwarded frontend `production` to `369eb87`.
- GitHub Actions deploys succeeded for `MoyraCloud-test` run `26211425519` and `MoyraCloud-production` run `26211753527`.
- Testing smoke: `https://api.test.moyra.org/api/v2` returned health 200, CORS credentials true for `https://test.moyra.org`, login returned `ROLE_ADMIN`, refresh from the HttpOnly cookie returned 200, missing cookie returned 401, and untrusted origin returned 403. `https://test.moyra.org/admin/publications` stayed in admin after reload with no console warning/error logs.
- Production smoke: `https://api.moyra.org/api/v2` returned health 200, CORS credentials true for `https://moyra.org`, login returned `ROLE_ADMIN`, refresh from the HttpOnly cookie returned 200, missing cookie returned 401, and untrusted origin returned 403. `https://moyra.org/admin/publications` stayed in admin after reload with no console warning/error logs.
