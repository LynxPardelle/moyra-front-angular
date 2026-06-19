# Moyra Client Cases Portal - Design

Date: 2026-06-18 CT
Status: Approved for spec review
Scope: New private Cases module for client communication, documents, comments, configurable statuses, permissions, and notifications. Public Publications remain unchanged.

## Summary

Moyra needs a private client portal where clients can sign in, see their legal cases, receive updates, comment, and upload documents. This is a new feature, not a replacement for the current public Publications section.

The approved product direction is a new private **Casos** module. It may reuse proven pieces from Publications, such as rich text editing, file upload/presentation, and card/list patterns, but it must not reuse public SEO routes or mix confidential case data into public publication records.

The architecture should start with a focused, secure MVP and leave a clear path toward a fuller collaboration platform later. The future direction includes stricter workflows, richer realtime collaboration, and possibly native/mobile push. The MVP should establish the right boundaries now: server-side authorization, audit events, notification records, and private case data ownership.

## Approved Decisions

- Public `/publications` and `/publication/:id` behavior remains as-is.
- The visible product language is **Casos**.
- Cases can include multiple client accounts/parties and multiple authorized contacts.
- Permissions management is in scope for the MVP.
- Default visibility for a case entry or thread is all case members, with optional restriction to selected recipients.
- Comments are visible immediately within the selected thread/entry scope.
- Documents uploaded by clients are immediately visible to the internal team, but require attorney confirmation before becoming visible to other external case members.
- Attorneys configure case types and status flows. Statuses are not hard-coded by engineering.
- MVP case status flows include ordered states, labels, and colors, but do not enforce strict transitions.
- Internal users need finer roles than global `ROLE_ADMIN`, including attorney and intern/paralegal style permissions.
- Intern/paralegal access uses configurable per-case permissions with simple presets.
- Users can be invited by email from a case; if the user does not exist, Moyra creates or initiates the account flow.
- Notifications include in-app notification center, transactional email, and Web Push for supported browsers.
- In-app notifications are the source of truth; email and push are delivery channels that may fail or be disabled.
- Email should use Amazon SES or an equivalent transactional provider. The preferred path is SES with a dedicated subdomain and verified identity, without disrupting Microsoft 365 mail records.
- Frontend implementation should target Angular 21, not Angular 22, until NgRx publishes Angular 22-compatible packages.

## Non-Goals

- No changes to public Publications.
- No SEO fields or public indexing for private case entries.
- No public unauthenticated case route.
- No native mobile app in the MVP.
- No strict workflow engine or BPM-style transition enforcement in the MVP.
- No full realtime chat requirement in the MVP.
- No legal advice automation.
- No storing full confidential case contents in email or push payloads.
- No using the operational SNS alarm topic as product notification infrastructure.

## Existing System Context

Frontend repo state observed during design:

- `moyra-front-angular` is on Angular `20.3.x`.
- `package.json` already includes NgRx packages for auth: `@ngrx/store`, `@ngrx/effects`, `@ngrx/signals`, and `@ngrx/store-devtools`.
- Auth state is centralized under `src/app/store/auth/`.
- Public Publications are implemented through `PublicationService`, public routes, admin routes, rich text editor, and file upload/presentation components.
- `Publication` currently has fields for title, text, insertions, YouTube, files, slug, creation date, ID, and SEO metadata. It has no visibility or case membership fields.
- `UsuariosComponent` already creates Cognito-backed users with `ROLE_USER` or `ROLE_ADMIN`.

Backend repo state observed during design:

- `moyra-infra-serverless` contains the serverless API v2 and CDK stack.
- API route families are split into domain Lambdas such as public-site, admin-content, auth, files, ai, and cost.
- Current content GET routes are public-site routes. Current content write routes require admin auth.
- Publications are part of the generic content route system. `GET /api/v2/publications` and `GET /api/v2/publications/{id}` are public reads today.
- Auth uses Cognito groups/custom role claims and server-side admin checks.
- S3 file upload/presign infrastructure exists and can be reused only if case authorization is added before upload/download.

Important repository caveat:

- During design, `moyra-infra-serverless` had unrelated dirty files. The design uses it as evidence only and does not modify it.

## Recommended Architecture

Create a new private Cases module instead of extending public Publications.

Recommended module boundaries:

- Frontend feature area: Cases portal and admin/internal case management.
- Backend route family: `cases-api` or an equivalent private route group in the existing API v2 architecture.
- Data ownership: new case-specific DynamoDB tables/entities separate from `publications`.
- File ownership: case file records must carry case identity and authorization metadata. Existing S3/presign mechanics may be reused only through case-aware endpoints.
- Notification ownership: notifications are first-class records, not only email or push side effects.
- Audit ownership: sensitive actions create audit events.

This keeps public marketing/legal content separate from confidential legal communication and makes future collaboration workflows possible without reworking the public content system.

## Data Model

### `caseTypes`

Purpose: attorney-configurable case type and status flow.

Core fields:

- `id`
- `name`
- `description`
- `statusFlow`
- `createdAt`
- `updatedAt`
- `archivedAt`

`statusFlow` contains ordered status definitions:

- `statusId`
- `label`
- `color`
- `sortOrder`
- `isInitial`
- `isClosed`

MVP rule: status changes are not transition-restricted, but every change is audited.

### `cases`

Purpose: private case file container.

Core fields:

- `id`
- `caseTypeId`
- `title`
- `internalSummary`
- `clientVisibleSummary`
- `currentStatusId`
- `responsibleUserIds`
- `createdByUserId`
- `createdAt`
- `updatedAt`
- `archivedAt`

Security rule: no case is readable unless the caller is admin or has effective membership for that case.

### `caseMemberships`

Purpose: who has access to a case and what they can do.

Core fields:

- `id`
- `caseId`
- `userId`
- `accountId` or `partyId`
- `partyLabel`
- `memberType`: `internal | external`
- `rolePreset`
- `permissions`
- `invitedByUserId`
- `invitedAt`
- `acceptedAt`
- `revokedAt`

Permission examples:

- `case.read`
- `case.manage`
- `case.invite`
- `case.status.update`
- `entry.create`
- `entry.publishExternal`
- `comment.create`
- `file.upload`
- `file.approveExternal`
- `file.download`
- `audit.read`

Recommended presets:

- `Admin interno`: all case permissions.
- `Abogado responsable`: manage assigned case, publish, approve files, invite, change status.
- `Pasante lector`: read assigned cases and internal notes only.
- `Pasante colaborador`: read, upload, comment internally, create drafts.
- `Pasante con publicación supervisada`: create entries requiring attorney publish approval.
- `Cliente lector`: read shared case entries/files.
- `Cliente colaborador`: read, comment, upload client documents.

Effective permissions must be calculated server-side.

### `caseEntries`

Purpose: private publication-like updates inside cases.

Core fields:

- `id`
- `caseId`
- `title`
- `bodyHtml`
- `bodyPlainText`
- `authorUserId`
- `visibilityMode`: `case | restricted`
- `recipientUserIds`
- `recipientMembershipIds`
- `fileIds`
- `pinned`
- `createdAt`
- `updatedAt`
- `deletedAt`

Differences from public Publications:

- No SEO title.
- No SEO description.
- No SEO keywords.
- No public slug requirement.
- No public route.
- No inclusion in `/api/v2/site` or public publication feeds.

### `caseComments`

Purpose: threaded communication on entries.

Core fields:

- `id`
- `caseId`
- `entryId`
- `parentCommentId`
- `bodyHtml` or `bodyText`
- `authorUserId`
- `visibilityMode`
- `recipientUserIds`
- `createdAt`
- `updatedAt`
- `deletedAt`

MVP rule: comments publish immediately inside the inherited entry/thread scope. If an entry is restricted, comments inherit that restricted audience unless an authorized internal user explicitly changes the scope.

### `caseFiles`

Purpose: documents attached to cases, entries, or comments.

Core fields:

- `id`
- `caseId`
- `uploadedByUserId`
- `source`: `internal | client`
- `title`
- `category`
- `contentType`
- `sizeBytes`
- `s3Key`
- `visibilityStatus`: `internalOnly | externallyVisible | rejected`
- `visibilityMode`
- `recipientUserIds`
- `approvedByUserId`
- `approvedAt`
- `createdAt`
- `deletedAt`

MVP rule:

- Internal uploads can be made visible based on selected recipients.
- Client uploads are visible to internal members immediately.
- Client uploads are not visible to other external members until approved or shared by an attorney.

### `notifications`

Purpose: durable notification center.

Core fields:

- `id`
- `recipientUserId`
- `caseId`
- `actorUserId`
- `eventType`
- `title`
- `safeSummary`
- `targetUrl`
- `channelsRequested`: `inApp | email | webPush`
- `channelsDelivered`
- `readAt`
- `createdAt`
- `deliveryAttempts`

Security rule: `safeSummary` must not include full confidential legal content. Email/push should use safe summaries only.

### `pushSubscriptions`

Purpose: Web Push subscriptions per user/device/browser.

Core fields:

- `id`
- `userId`
- `endpoint`
- `keys`
- `userAgent`
- `enabled`
- `createdAt`
- `lastUsedAt`
- `disabledAt`

### `auditEvents`

Purpose: compliance and operational traceability.

Core fields:

- `id`
- `caseId`
- `actorUserId`
- `eventType`
- `targetType`
- `targetId`
- `metadata`
- `createdAt`
- `requestId`

Audit event examples:

- case created
- user invited
- membership changed
- permission changed
- status changed
- entry created/updated/deleted
- comment created/deleted
- file uploaded
- file approved for external visibility
- file downloaded
- notification delivery failed

Do not log full confidential body text in audit metadata.

## API Surface

Representative endpoints:

- `GET /api/v2/cases`
- `POST /api/v2/cases`
- `GET /api/v2/cases/{caseId}`
- `PUT /api/v2/cases/{caseId}`
- `GET /api/v2/case-types`
- `POST /api/v2/case-types`
- `PUT /api/v2/case-types/{caseTypeId}`
- `GET /api/v2/cases/{caseId}/members`
- `POST /api/v2/cases/{caseId}/members/invite`
- `PUT /api/v2/cases/{caseId}/members/{membershipId}`
- `DELETE /api/v2/cases/{caseId}/members/{membershipId}`
- `GET /api/v2/cases/{caseId}/entries`
- `POST /api/v2/cases/{caseId}/entries`
- `GET /api/v2/cases/{caseId}/entries/{entryId}`
- `PUT /api/v2/cases/{caseId}/entries/{entryId}`
- `DELETE /api/v2/cases/{caseId}/entries/{entryId}`
- `GET /api/v2/cases/{caseId}/entries/{entryId}/comments`
- `POST /api/v2/cases/{caseId}/entries/{entryId}/comments`
- `POST /api/v2/cases/{caseId}/files/presign`
- `GET /api/v2/cases/{caseId}/files`
- `GET /api/v2/cases/{caseId}/files/{fileId}/download`
- `PUT /api/v2/cases/{caseId}/files/{fileId}/visibility`
- `GET /api/v2/case-notifications`
- `GET /api/v2/case-notifications/unread-count`
- `POST /api/v2/case-notifications/{notificationId}/read`
- `POST /api/v2/case-notifications/read-all`
- `GET /api/v2/case-notification-preferences`
- `PUT /api/v2/case-notification-preferences`
- `GET /api/v2/case-push-subscriptions`
- `POST /api/v2/case-push-subscriptions`
- `DELETE /api/v2/case-push-subscriptions/{subscriptionId}`

Every case-scoped endpoint must verify membership and effective permissions server-side.

## User Experience

### Admin / attorney

Add admin navigation for:

- `Casos`
- `Tipos de caso`
- `Notificaciones`

Primary views:

- Case list with filters by status, responsible user, client/party, unread activity, archived state.
- Case detail with status, type, responsible attorneys, participants, permissions, timeline, documents, comments, and audit.
- Case type manager for configuring status flows.
- Invite modal from case detail.
- Permission editor with presets and optional advanced permissions.

The UI should stay consistent with Moyra:

- Rectilinear controls.
- Dense but readable legal operations layout.
- No marketing hero treatment.
- Clear empty/loading/error states.

### Intern / paralegal

Interns see only assigned cases and actions allowed by effective permissions.

Possible actions:

- Read case timeline.
- Comment internally.
- Upload internal draft/supporting files.
- Create draft entries.
- Publish externally only if explicitly granted or supervised by attorney workflow.

### Client

Client portal routes should be separate from admin routes, for example:

- `/mis-casos`
- `/mis-casos/{caseId}`
- `/notificaciones`

Client can:

- See authorized cases.
- See current visible status.
- Read visible private entries.
- Comment within allowed scope.
- Upload documents.
- See shared documents.
- Manage notification preferences.
- Change password through existing account flow.

Client cannot:

- See public admin panels.
- See SEO tools.
- See other cases without membership.
- See files pending attorney approval unless they uploaded the file or have internal permission.

## Notification Design

Notification events should be created after successful domain writes, for example:

- new case entry
- new comment
- new client upload
- file approved for external visibility
- status changed
- user invited
- permission changed

Delivery channels:

- In-app notification center: required.
- Email: required for MVP, using SES or equivalent.
- Web Push: required for supported browsers and opted-in users.

Email design:

- Use safe subject/body.
- Do not include full confidential legal content.
- Link to authenticated route.
- Identify environment for test emails.
- Use verified SES identity.
- Prefer dedicated subdomain such as `notificaciones.moyra.org`, `mail.moyra.org`, or another approved subdomain.
- Do not change Microsoft 365 MX records.
- SPF/DKIM/DMARC must be planned so Microsoft 365 mail is not broken.

Web Push design:

- Requires Angular service worker/PWA support.
- Users must opt in.
- Store subscriptions per user/device.
- Handle unsupported browsers and denied permissions.
- Push payload must be safe and minimal.
- In-app notification remains authoritative.

## Security And Compliance

### Trust Boundaries

- Browser to API: authenticated HTTPS calls.
- API to Cognito: token validation and user management.
- API to DynamoDB: case data, memberships, notifications, audit.
- API to S3: case files and presigned upload/download.
- API to SES: outbound email.
- API to push service: Web Push delivery.

### Top Abuse Cases

| Abuse case | Impact | Mitigation |
| --- | --- | --- |
| User accesses another client's case by guessing ID | Confidential legal data exposure | Server-side membership checks on every case-scoped endpoint; negative tests for cross-case access |
| Email or push leaks sensitive legal content | Confidentiality breach | Safe summaries only; authenticated links; no full body/file names if sensitive |
| Client uploads malicious or oversized files | Malware/storage abuse/cost risk | File type allowlist, size limits, scanning strategy or quarantine follow-up, rate limiting |
| Unauthorized user changes permissions or status | Case workflow/control loss | Permission-specific server checks, audit events, admin review UI |
| Notification spam from comments/invites | User trust and deliverability risk | Rate limiting, notification preferences, SES bounce/complaint monitoring |

### Required Controls

- Cognito-backed authentication.
- Server-side authorization by case/membership/permission.
- Least privilege IAM for cases route family.
- Short-lived presigned URLs.
- Input validation for all writes.
- Output encoding/sanitization for rendered rich text.
- Audit events for sensitive actions.
- Structured logs with request IDs, but no confidential bodies.
- Rate limits for invites, comments, uploads, notification sends, and password-related flows.
- Backup/restore posture for DynamoDB and S3 data.
- Dependency and vulnerability checks before promotion.

## Angular / Frontend Technical Direction

Target Angular version for implementation: **Angular 21**.

Rationale:

- The repo currently uses NgRx.
- `npm view @ngrx/store version peerDependencies --json` returned latest `21.1.1` with `@angular/core: ^21.0.0`.
- `npm view @ngrx/effects version peerDependencies --json` returned latest `21.1.1` with `@angular/core: ^21.0.0`.
- `npm view @ngrx/signals version peerDependencies --json` returned latest `21.1.1` with `@angular/core: ^21.0.0`.
- Angular 22 should be deferred until NgRx publishes compatible packages.

Angular 21 compatibility notes:

- Official Angular version compatibility lists Angular 21 with Node `^20.19.0 || ^22.12.0 || ^24.0.0`, TypeScript `>=5.9.0 <6.0.0`, and RxJS `^6.5.3 || ^7.4.0`.
- Local environment observed during design: Node `v24.15.0`, npm `11.12.1`, TypeScript `5.9.2`, RxJS `7.8.2`.

Frontend state approach:

- Keep existing NgRx auth store.
- Do not add global NgRx feature state for Cases unless implementation evidence shows it is needed.
- Prefer case feature services/facades and Angular signals for view-local state.
- Keep authorization decisions server-side; frontend state is only presentation.

Angular AI tooling:

- Use official Angular update guide before version upgrade.
- Use official Angular CLI MCP and/or official Angular Agent Skills when frontend implementation begins.
- Keep generated Angular code aligned with the repo's current style and Angular 21 constraints.

## Backend Technical Direction

Backend should use existing serverless patterns:

- Add a dedicated route family or handler group for cases.
- Add new DynamoDB tables and GSIs for case query patterns.
- Reuse Cognito user creation/invitation mechanics where safe.
- Reuse S3 upload/presign architecture only with case-specific authorization.
- Add SES permissions only when SES identity and sending domain are approved.
- Add Web Push secrets/configuration through secure environment/secret storage, not frontend environment files.

Potential DynamoDB access patterns:

- List cases for a user by `userId`.
- List members for a case by `caseId`.
- List entries/comments/files by `caseId`.
- List unread notifications by `recipientUserId`.
- List audit events by `caseId`.
- Lookup invitation/membership by email when accepting invite.

Avoid table scans for normal client portal usage.

## Testing Strategy

Backend tests:

- Reject unauthenticated case list/detail.
- Reject authenticated user without membership.
- Allow admin/internal authorized user.
- Allow client only for assigned case.
- Enforce permission presets.
- Enforce restricted entry recipients.
- Verify comments inherit scope.
- Verify client uploads are internal-only until approved.
- Verify file download rejects unauthorized users.
- Verify invite creates or links Cognito user and membership.
- Verify notification recipients are calculated from permissions.
- Verify email/push payloads do not contain full confidential body.
- Verify audit events for permission/status/file visibility changes.
- Verify no case data appears in `/api/v2/site` or public publications.

Frontend tests:

- Case list renders states/loading/empty/error.
- Client route shows only authorized actions.
- Admin permission editor applies presets.
- Case type editor manages status labels/colors/order.
- Client upload shows pending/visible state correctly.
- Comments post immediately in allowed scope.
- Notification center marks read/unread.
- Web Push unsupported/denied states are handled.
- Existing public Publications tests remain green.

Browser QA:

- Admin creates case type/status flow.
- Admin creates case.
- Admin invites client and internal user.
- Client logs in, sees assigned case only.
- Client comments.
- Client uploads file.
- Attorney sees client upload internally and approves external visibility.
- Other external member only sees approved file.
- In-app notification appears.
- Email notification is safe.
- Web Push opt-in path works where supported.
- Public `/publications` and `/publication/:id` still work.

## Release Plan

Planning vocabulary:

- The phases below are product/release phases from the spec.
- The implementation plan breaks these phases into smaller executable sprints.
- A sprint is not a new product phase; it is a testable implementation slice inside one of these phases.

Phase 1: Backend domain foundation

- Data model and tables.
- Case authorization helpers.
- Case CRUD and membership/invite endpoints.
- Audit event writes.
- Unit tests for permissions.

Phase 2: Internal admin portal

- Angular 21 upgrade.
- Case list/detail.
- Case type/status configuration.
- Members and permissions UI.
- Internal comments/entries/files.

Phase 3: Client portal

- Client case list/detail.
- Client comments.
- Client uploads.
- Document visibility workflow.
- Client-safe navigation/account actions.

Phase 4: Notifications

- Notification records and center.
- SES email delivery.
- Web Push subscription storage first; Web Push delivery after Angular service worker integration.
- User notification preferences.
- Delivery logging and failure states.

Phase 5: Hardening and release

- Threat-model review.
- Negative permission tests.
- Browser QA across internal/client roles.
- Testing environment deployment.
- Production promotion only after test smoke and security review.

Phase-to-sprint mapping:

- Phase 1 maps to implementation Sprints 0-3.
- Phase 2 maps to implementation Sprints 5-6.
- Phase 3 maps to implementation Sprint 7.
- Phase 4 maps to implementation Sprints 4 and 8.
- Phase 5 maps to implementation Sprint 9.

## Open Implementation Decisions

These decisions do not change the approved product design, but should be resolved during implementation planning or before production release as noted.

- Exact SES subdomain name.
- SES sandbox/production sending setup.
- Whether product notification email should use SES v1 or SES v2 API.
- Web Push sender integration details for Sprint 8. Sprint 4 selected `web-push` as the VAPID-compatible candidate after `npm view web-push version` returned `3.6.7`, but does not add the sender dependency yet.
- Exact DynamoDB table split and GSI names after implementation query review.
- Whether case file malware scanning is MVP or first hardening follow-up.
- Whether internal comments need a separate internal-only note type.
- Whether invitations expire and how resend/revoke behaves.

## References Checked During Design

- Angular version compatibility: https://angular.dev/reference/versions
- Angular update guide: https://angular.dev/update-guide
- Angular CLI MCP Server: https://angular.dev/ai/mcp
- Angular Agent Skills: https://angular.dev/ai/agent-skills
- Angular Push notifications: https://angular.dev/ecosystem/service-workers/push-notifications
- Angular `SwPush`: https://angular.dev/api/service-worker/SwPush
- Amazon SES `SendEmail`: https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html
- Amazon SES API email sending: https://docs.aws.amazon.com/ses/latest/dg/send-email-api.html
- Amazon SNS mobile push docs, future native/mobile reference only: https://docs.aws.amazon.com/sns/latest/dg/mobile-push-notifications.html
- MDN Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- npm registry checks for `@ngrx/store`, `@ngrx/effects`, and `@ngrx/signals` on 2026-06-18 CT.

## Approval Gate

This design is approved for written spec review as of 2026-06-18 CT.

Implementation should not begin until the user reviews this document and approves moving into a detailed implementation plan.
