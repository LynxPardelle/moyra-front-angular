# Moyra Agent Audit Notes

Times are Central Time.

## UI/UX Direction

- The user wants UI/UX improvements planned collaboratively before broad implementation.
- Visual constraint: no rounded borders. Use square/rectilinear UI surfaces.
- Shadows are acceptable when they support restrained glassmorphism or elevation.
- First agreed improvement candidate was replacing the browser favicon with the Moyra/MRA logo.
- Evidence from the live site on 2026-05-20: `https://moyra.org` returned HTTP 200, and the live `/favicon.ico` matched the local `public/favicon.ico`; the icon preview showed the default Angular favicon, not the Moyra logo.

## Blog Article UX Audit - 2026-05-21 00:08 CT

- Local Blog/Article admin and public flow was audited.
- `/blog` and `/admin/blog` returned 0 article cards and no Browser console warning/error logs.
- `ArticleComponent` supports rich intro/outro, SEO preview, section insertions, image previews, and uploads.
- Sections/uploads are hidden until the article is saved once.
- Full CRUD automation was blocked by the Browser runtime, not by confirmed app behavior:
  - `fill/type` failed because the virtual clipboard is not installed.
  - Keypress worked only on regular inputs.
  - Quill contenteditable could not be focused reliably.
  - No test article was created or deleted during that audit.
- Recommended redesign direction: a guided article workspace for draft metadata, SEO/share preview, section editing, files/embeds, and final preview; reuse publication file/embed presentation patterns for Blog.

## Testing Auth Blocker - 2026-05-21 00:52 CT

- Testing bundle updated after merging to `test`: `https://test.moyra.org` served `main-Y4MQXFBW.js`.
- Public testing audit passed for `/blog` and `/publications`: both routes loaded with empty states and no Browser console warning/error logs.
- Authenticated admin audit was blocked because the in-app Browser tab at `https://test.moyra.org/inicio` had no `token` or `identity` in `localStorage` or `sessionStorage`, no cookies, and no admin nav.
- Admin routes redirected to `/login?returnUrl=...`, which was correct guard behavior for the browser state at that time.

## Session Expiry Finding - 2026-05-21 00:55 CT

- Testing JWTs expired about one hour after login.
- The API then had no `/auth/refresh`, `/auth/me`, `/auth/session`, or `/users/me` endpoint.
- Long-lived active sessions required a backend refresh-token flow.
- The frontend must not store passwords or extend expired JWTs locally.

## Secret Hygiene

- This repo-local memory split intentionally avoids storing passwords, bearer tokens, JWTs, cookie values, private keys, or account credentials.
- Public hostnames, public API base URLs, commit SHAs, and GitHub Actions run IDs are acceptable as operational evidence.
- Cookie names and route names are documented only as architecture, never as credential values.
