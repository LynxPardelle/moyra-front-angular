# Moyra Client Cases API Contract

**Generated**: 2026-06-18 20:08:59 -06:00 CT  
**Sprint**: 0  
**Status**: Baseline contract for implementation  
**Related Spec**: `docs/superpowers/specs/2026-06-18-moyra-client-cases-portal-design.md`  
**Related Plan**: `docs/superpowers/plans/moyra-client-cases-portal-plan.md`

## Purpose

This contract defines the private **Casos** API surface for Moyra's client portal. It is intentionally separate from public Publications.

The public Publications feature must remain unchanged:

- Public frontend routes `/publications` and `/publication/:id` stay public.
- Public API routes `/api/v2/publications` and `/api/v2/publications/{id}` stay public.
- Private case entries must never appear in public publication, site, blog, service, or SEO responses.
- Case entries must not accept or return SEO fields.

## Implementation Boundary

Backend route group:

- Add a dedicated `cases` domain wrapper, matching the existing `createHandler({ routeGroup: "..." })` pattern.
- `routeGroupForRequest(method, path)` should return `cases` for:
  - paths starting with `/api/v2/cases`
  - paths starting with `/api/v2/case-types`
  - paths starting with `/api/v2/case-notifications`
  - path `/api/v2/case-notification-preferences`
  - paths starting with `/api/v2/case-push-subscriptions`

Frontend service boundary:

- Add `src/app/services/case.service.ts`.
- Add shared DTOs in `src/app/models/case.ts`.
- Use existing `apiUrl('/...')`, `jsonAuthHeaders(...)`, and stored/authenticated token conventions.
- Keep global NgRx auth as-is. Do not add broad global Cases state unless implementation evidence shows it is needed.

## Feature Flags

Flags must fail closed. Frontend flags hide navigation and controls. Backend flags deny route behavior even if a user calls the API directly.

| Flag | Default Local | Default Test | Default Production | Backend Behavior When Disabled | Frontend Behavior When Disabled |
|---|---:|---:|---:|---|---|
| `CASES_FEATURE_ENABLED` | `false` until local backend exists | `false` until Sprint 2 test deploy | `false` until release approval | Return `404` with standard route-not-found envelope for all Cases routes | Hide `/casos`, `/admin/casos`, and notification case links |
| `CASE_CLIENT_UPLOADS_ENABLED` | `false` until Sprint 3 | `false` until upload smoke passes | `false` until release approval | Deny upload init and completion with `403` | Hide upload controls and show read-only file list |
| `CASE_EMAIL_NOTIFICATIONS_ENABLED` | `false` | `false` until SES test identity is configured | `false` until sender DNS is confirmed | Create in-app notifications; mark email delivery as `skipped` | Allow preference display but show email channel unavailable |
| `CASE_WEB_PUSH_ENABLED` | `false` | `false` until VAPID/test service worker is configured | `false` until release approval | Deny push subscription writes with `403`; keep in-app notifications | Hide browser push opt-in |
| `CASE_INVITES_ENABLED` | `false` until Cognito invite flow is tested | `false` until invite smoke passes | `false` until release approval | Deny invite creation/resend/cancel with `403` | Hide invite action or disable with unavailable state |

Email notification config:

- `CASE_EMAIL_FROM`: configured SES sender address/display name.
- `CASE_EMAIL_REPLY_TO`: optional reply-to address.
- `CASE_APP_BASE_URL`: absolute frontend base URL used to build authenticated case links.
- CDK `caseEmailIdentityArn`: verified SES identity ARN. SES permissions are not granted when this is omitted.

## Authentication

All Cases endpoints require a Cognito token in the `Authorization` header.

Accepted header shape:

```http
Authorization: Bearer <jwt>
```

The existing backend helper strips a `Bearer` prefix, so clients may also send the raw token while legacy code is being phased out. New frontend code should send `Bearer <jwt>` unless existing shared helpers require raw token.

Server-side identity resolution must support:

- Admin/internal user with existing admin claims.
- Internal collaborator/pasante through an internal membership or user role if added later.
- External client user through active `case-memberships`.

No endpoint may trust role, permission, or membership data sent by the frontend.

## Standard Response Envelopes

Success, single item:

```json
{
  "status": "success",
  "item": {}
}
```

Success, collection:

```json
{
  "status": "success",
  "items": [],
  "nextToken": null
}
```

Mutation success:

```json
{
  "status": "success",
  "item": {},
  "auditEventId": "opaque-audit-id"
}
```

Error:

```json
{
  "status": "error",
  "message": "No autorizado."
}
```

Expected error status codes:

| Status | Meaning | Message Convention |
|---:|---|---|
| `400` | Invalid body, invalid field, unsupported status transition input, invalid file metadata | Specific Spanish validation message |
| `401` | Missing, invalid, or expired token | `No autorizado.` |
| `403` | Authenticated user lacks permission | `No tienes acceso a esta zona.` |
| `404` | Case resource not found, inaccessible by ID, or feature disabled | `No encontrado.` or `Ruta no encontrada.` |
| `409` | Duplicate invite, duplicate membership, stale update version, conflicting status/default | `Conflicto.` or specific Spanish conflict message |
| `429` | Rate limit, if implemented later | Specific Spanish rate-limit message |

Do not reveal whether a case ID exists to a non-member. Return the same `404` behavior for nonexistent and unauthorized-by-ID resources where possible.

## IDs And Timestamps

- IDs are opaque strings. Clients must not parse or construct them.
- Timestamps are ISO 8601 strings in UTC.
- UI may render local time, but API storage and contracts use UTC.
- Mutating DTOs may include `version` for optimistic concurrency after Sprint 2.

## Permission Keys

The backend must use one authorization gate, planned as `requireCasePermission`, for all private case actions.

Initial permission keys:

| Permission | Grants |
|---|---|
| `case.read` | Read case metadata, visible entries, visible comments, visible files |
| `case.write_entry` | Create/update private case entries |
| `case.comment` | Create/update/delete own allowed comments |
| `case.upload_file` | Initialize and complete case file uploads |
| `case.download_file` | Download visible case files |
| `case.approve_file_visibility` | Approve/restrict/reject external file visibility |
| `case.manage_members` | Add, remove, invite, resend invites, cancel invites |
| `case.manage_status` | Change case status |
| `case.manage_case_type` | Manage case type and status catalog |
| `case.manage_permissions` | Change role presets or granular permissions |
| `case.read_audit` | Read case audit events |
| `case.manage_notifications` | Admin diagnostic access to notification delivery state |

Suggested initial role presets:

| Preset | Intended User | Default Permissions |
|---|---|---|
| `owner_attorney` | Lead attorney/admin | All permissions |
| `attorney` | Attorney collaborator | All except destructive system configuration if later added |
| `pasante` | Intern/collaborator | Read, comment, upload, draft/internal entry if granted, no member/permission management by default |
| `client` | External client | Read visible content, comment, upload, download approved visible files |
| `external_observer` | External limited participant | Read visible content, download visible files, no comment/upload by default |

Role presets are starting templates. The persisted membership should store the resulting permission set plus any overrides so attorneys can adapt per case.

## Core DTOs

### CaseType

```ts
type CaseType = {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  statuses: CaseStatus[];
  defaultStatusId?: string;
  createdAt: string;
  updatedAt: string;
};
```

### CaseStatus

```ts
type CaseStatus = {
  id: string;
  caseTypeId: string;
  label: string;
  color: string;
  order: number;
  active: boolean;
  isDefault?: boolean;
};
```

MVP status behavior:

- Attorneys/admins define labels, colors, order, and active/default state.
- Cases can move freely between active statuses.
- Strict transition rules are not part of MVP.
- Every status change creates an audit event.

### Case

```ts
type Case = {
  id: string;
  title: string;
  reference?: string;
  description?: string;
  caseTypeId: string;
  statusId: string;
  status?: CaseStatus;
  leadUserId?: string;
  active: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  unreadCount?: number;
  memberSummary?: CaseMemberSummary[];
};
```

### CaseMembership

```ts
type CaseMembership = {
  id: string;
  caseId: string;
  userId?: string;
  email: string;
  displayName?: string;
  partyId?: string;
  partyLabel?: string;
  memberType: "internal" | "external";
  rolePreset: "owner_attorney" | "attorney" | "pasante" | "client" | "external_observer";
  permissions: string[];
  status: "active" | "invited" | "removed";
  invitedAt?: string;
  acceptedAt?: string;
  removedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

### CaseEntry

```ts
type CaseEntry = {
  id: string;
  caseId: string;
  title: string;
  text: string;
  insertions?: CaseEntryInsertion[];
  authorUserId: string;
  authorDisplayName?: string;
  visibility: CaseVisibility;
  fileIds: string[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
};
```

Forbidden case entry fields:

- `seoTitle`
- `seoDescription`
- `seoKeywords`
- `slug`
- `urltitle`
- `publicUrl`
- `canonicalUrl`
- `published`

If these fields are present in a create/update request, the API should return `400`.

### CaseVisibility

```ts
type CaseVisibility = {
  mode: "case_members" | "internal_only" | "selected_members" | "selected_parties";
  memberIds?: string[];
  partyIds?: string[];
};
```

### CaseComment

```ts
type CaseComment = {
  id: string;
  caseId: string;
  entryId: string;
  parentCommentId?: string;
  text: string;
  authorUserId: string;
  authorDisplayName?: string;
  visibility: CaseVisibility;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};
```

### CaseFile

```ts
type CaseFile = {
  id: string;
  caseId: string;
  uploaderUserId: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  s3Key: string;
  visibility: CaseVisibility;
  externalVisibilityStatus: "pending" | "approved" | "restricted" | "rejected" | "internal_only";
  approvedByUserId?: string;
  approvedAt?: string;
  rejectedByUserId?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

Client upload default:

- Internal members with file read permission can see it immediately.
- External members cannot see it while `externalVisibilityStatus` is `pending`.
- Attorney/internal approval is required before external visibility.

### CaseNotification

```ts
type CaseNotification = {
  id: string;
  recipientUserId: string;
  caseId: string;
  eventType:
    | "case.entry.created"
    | "case.comment.created"
    | "case.file.visibility_updated"
    | "case.status.updated"
    | "case.archived";
  targetType: "case" | "case-entry" | "case-comment" | "case-file";
  targetId: string;
  title: string;
  body: string;
  link: {
    path: string;
  };
  readAt?: string;
  delivery: {
    inApp: {
      status: "created";
    };
    email: {
      status: "skipped" | "pending" | "sent" | "failed";
      reason?: string;
      messageId?: string;
      sentAt?: string;
      failedAt?: string;
    };
    webPush: {
      status: "skipped" | "queued" | "sent" | "failed";
      reason?: string;
    };
  };
  dedupeKey: string;
  createdAt: string;
  updatedAt: string;
};
```

Notification title/body must be safe summaries. Do not include full legal content, full comments, document contents, raw S3 keys, or sensitive filenames unless a later explicit decision changes this rule.

### AuditEvent

```ts
type AuditEvent = {
  id: string;
  caseId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  requestId?: string;
  createdAt: string;
};
```

## Routes

### Case Types And Status Catalog

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/case-types` | authenticated internal or case member read context | List active case types and statuses |
| `POST` | `/api/v2/case-types` | `case.manage_case_type` | Create case type |
| `GET` | `/api/v2/case-types/{caseTypeId}` | authenticated internal or case member read context | Read case type |
| `PUT` | `/api/v2/case-types/{caseTypeId}` | `case.manage_case_type` | Update case type metadata |
| `POST` | `/api/v2/case-types/{caseTypeId}/statuses` | `case.manage_case_type` | Add status |
| `PUT` | `/api/v2/case-types/{caseTypeId}/statuses/{statusId}` | `case.manage_case_type` | Update status |
| `POST` | `/api/v2/case-types/{caseTypeId}/statuses/reorder` | `case.manage_case_type` | Reorder statuses |

Create case type body:

```json
{
  "name": "string",
  "description": "string",
  "statuses": [
    {
      "label": "string",
      "color": "#334155",
      "order": 1,
      "isDefault": true
    }
  ]
}
```

### Cases

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases` | authenticated | List cases visible to requester |
| `POST` | `/api/v2/cases` | internal with `case.manage_members` or admin bootstrap permission | Create case |
| `GET` | `/api/v2/cases/{caseId}` | `case.read` | Read case detail |
| `PUT` | `/api/v2/cases/{caseId}` | internal case write permission | Update case metadata |
| `PUT` | `/api/v2/cases/{caseId}/status` | `case.manage_status` | Change case status |
| `POST` | `/api/v2/cases/{caseId}/archive` | internal case write permission | Archive case |

List query parameters:

- `scope`: `mine` for current user's active memberships; `all` for internal users with broader permission.
- `statusId`
- `caseTypeId`
- `memberId`
- `search`
- `limit`
- `nextToken`

Create case body:

```json
{
  "title": "string",
  "reference": "string",
  "description": "string",
  "caseTypeId": "opaque-case-type-id",
  "statusId": "opaque-status-id",
  "leadUserId": "opaque-user-id"
}
```

### Members And Invites

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases/{caseId}/members` | `case.read` | List case members visible to requester |
| `POST` | `/api/v2/cases/{caseId}/members` | `case.manage_members` | Add existing user/member |
| `PUT` | `/api/v2/cases/{caseId}/members/{membershipId}` | `case.manage_members` | Update member metadata or role preset |
| `PUT` | `/api/v2/cases/{caseId}/members/{membershipId}/permissions` | `case.manage_permissions` | Update granular permissions |
| `DELETE` | `/api/v2/cases/{caseId}/members/{membershipId}` | `case.manage_members` | Mark member removed |
| `POST` | `/api/v2/cases/{caseId}/invites` | `case.manage_members` + `CASE_INVITES_ENABLED` | Invite by email |
| `POST` | `/api/v2/cases/{caseId}/invites/{inviteId}/resend` | `case.manage_members` + `CASE_INVITES_ENABLED` | Resend invite |
| `POST` | `/api/v2/cases/{caseId}/invites/{inviteId}/cancel` | `case.manage_members` + `CASE_INVITES_ENABLED` | Cancel invite |

Invite body:

```json
{
  "email": "cliente@example.com",
  "displayName": "string",
  "partyLabel": "string",
  "memberType": "external",
  "rolePreset": "client",
  "permissions": ["case.read", "case.comment", "case.upload_file", "case.download_file"]
}
```

Invite link behavior:

- The link may identify an invite token, but it must not reveal case data before authentication.
- If the user already exists, link membership to the existing user.
- If the user does not exist, initiate Cognito-compatible account creation/challenge flow.

### Entries

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases/{caseId}/entries` | `case.read` | List visible entries |
| `POST` | `/api/v2/cases/{caseId}/entries` | `case.write_entry` | Create case entry |
| `GET` | `/api/v2/cases/{caseId}/entries/{entryId}` | `case.read` | Read visible entry |
| `PUT` | `/api/v2/cases/{caseId}/entries/{entryId}` | `case.write_entry` | Update entry |
| `DELETE` | `/api/v2/cases/{caseId}/entries/{entryId}` | `case.write_entry` | Soft-delete entry |

Create/update entry body:

```json
{
  "title": "string",
  "text": "safe rich text html",
  "insertions": [],
  "visibility": {
    "mode": "case_members"
  },
  "fileIds": []
}
```

Validation:

- Reject forbidden SEO/public fields with `400`.
- Sanitize rich text using the same safe content constraints used for public content, plus stricter private-case iframe restrictions if needed.
- Validate every `fileId` belongs to the same case and requester can attach it.

### Comments

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases/{caseId}/entries/{entryId}/comments` | `case.read` | List visible comments |
| `POST` | `/api/v2/cases/{caseId}/entries/{entryId}/comments` | `case.comment` | Create comment |
| `PUT` | `/api/v2/cases/{caseId}/entries/{entryId}/comments/{commentId}` | `case.comment` plus owner/internal policy | Update comment |
| `DELETE` | `/api/v2/cases/{caseId}/entries/{entryId}/comments/{commentId}` | `case.comment` plus owner/internal policy | Soft-delete comment |

Create comment body:

```json
{
  "text": "string",
  "parentCommentId": "opaque-comment-id",
  "visibility": {
    "mode": "case_members"
  }
}
```

Comments are immediately visible inside their allowed scope after a successful response.

### Files

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases/{caseId}/files` | `case.read` | List visible case files |
| `POST` | `/api/v2/cases/{caseId}/files/presign` | `case.upload_file` + `CASE_CLIENT_UPLOADS_ENABLED` when external | Create S3 presigned PUT upload URL |
| `POST` | `/api/v2/cases/{caseId}/files/complete` | `case.upload_file` | Confirm uploaded file metadata |
| `GET` | `/api/v2/cases/{caseId}/files/{fileId}/download` | `case.download_file` | Return redirect or signed download after auth check |
| `PUT` | `/api/v2/cases/{caseId}/files/{fileId}/visibility` | `case.approve_file_visibility` | Approve/restrict/reject external visibility |
| `DELETE` | `/api/v2/cases/{caseId}/files/{fileId}` | internal file management permission | Soft-delete file record |

Presign request body:

```json
{
  "fileName": "document.pdf",
  "contentType": "application/pdf",
  "size": 12345
}
```

Presign response:

```json
{
  "status": "success",
  "file": {
    "id": "opaque-file-id",
    "caseId": "opaque-case-id",
    "externalVisibilityStatus": "pending",
    "uploadStatus": "pending_upload"
  },
  "upload": {
    "method": "PUT",
    "url": "https://s3-presigned-upload-target",
    "headers": {
      "content-type": "application/pdf"
    },
    "expiresIn": 300
  }
}
```

Rules:

- Upload keys must be generated server-side under a case-scoped prefix.
- Clients cannot send raw S3 keys.
- Presigned upload URL expiration should be short.
- File size/type validation happens before presign.
- Download checks membership, permission, and visibility every time.

### Notifications

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/case-notifications` | authenticated | List current user's notifications |
| `GET` | `/api/v2/case-notifications/unread-count` | authenticated | Get unread count |
| `POST` | `/api/v2/case-notifications/{notificationId}/read` | notification owner | Mark one read |
| `POST` | `/api/v2/case-notifications/read-all` | authenticated | Mark current user's notifications read |
| `GET` | `/api/v2/case-notification-preferences` | authenticated | Read current user's preferences |
| `PUT` | `/api/v2/case-notification-preferences` | authenticated | Update current user's preferences |

Preference body:

```json
{
  "email": {
    "enabled": true,
    "entryCreated": true,
    "commentCreated": true,
    "fileVisibilityApproved": true,
    "statusChanged": true
  },
  "webPush": {
    "enabled": false
  }
}
```

### Web Push Subscriptions

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/case-push-subscriptions` | authenticated | List current user's push subscriptions |
| `POST` | `/api/v2/case-push-subscriptions` | authenticated + `CASE_WEB_PUSH_ENABLED` | Register browser push subscription |
| `DELETE` | `/api/v2/case-push-subscriptions/{subscriptionId}` | subscription owner | Disable/delete push subscription |

Register body:

```json
{
  "endpoint": "string",
  "keys": {
    "p256dh": "string",
    "auth": "string"
  },
  "userAgent": "string"
}
```

Frontend Web Push requirements:

- Check `SwPush.isEnabled` before showing controls.
- Call `SwPush.requestSubscription({ serverPublicKey })` only after explicit user action.
- Use `notificationClicks` to route to authenticated case links.
- Sprint 4 only stores authenticated subscriptions and omits endpoint/key material from API responses. Actual push sending is reserved for Sprint 8; current notification records use `delivery.webPush.status = "skipped"` with reason `not_implemented`.

### Audit

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/v2/cases/{caseId}/audit-events` | `case.read_audit` | List case audit events |

Audit must cover:

- case create/update/archive
- member add/update/remove/invite/resend/cancel
- permission changes
- status changes
- entry create/update/delete
- comment create/update/delete
- file presign/complete/download/visibility changes
- notification preference changes

## Data Access Paths

Normal usage must not require table scans.

Required query patterns:

- cases visible to a user
- members by case ID
- membership by case ID and user ID
- pending invite by case ID and email
- entries by case ID and creation time
- comments by case ID and entry ID
- files by case ID and visibility state
- notifications by recipient user ID and unread/read state
- audit events by case ID and timestamp

## Security Acceptance Criteria

Before Sprint 2 is considered complete:

- Unauthenticated `/api/v2/cases` returns `401` or feature-disabled `404`.
- Non-member cannot list, read, comment, upload, download, or receive notifications for a case.
- Removed member loses access immediately.
- Client-uploaded file is visible to internal team but hidden from other external users while pending.
- Public `/api/v2/publications`, `/api/v2/site`, and public frontend routes expose no case data.
- Entry create/update rejects SEO/public fields.
- Every sensitive mutation writes an audit event.

## Sprint 0 Verification Notes

Current package checks on 2026-06-18 CT returned:

```json
{
  "@ngrx/store": {
    "version": "21.1.1",
    "peerDependencies": {
      "@angular/core": "^21.0.0",
      "rxjs": "^6.5.3 || ^7.5.0"
    }
  },
  "@ngrx/effects": {
    "version": "21.1.1",
    "peerDependencies": {
      "@angular/core": "^21.0.0",
      "@ngrx/store": "21.1.1",
      "rxjs": "^6.5.3 || ^7.5.0"
    }
  },
  "@ngrx/signals": {
    "version": "21.1.1",
    "peerDependencies": {
      "@angular/core": "^21.0.0",
      "rxjs": "^6.5.3 || ^7.4.0"
    }
  },
  "@ngrx/store-devtools": {
    "version": "21.1.1",
    "peerDependencies": {
      "@angular/core": "^21.0.0",
      "@ngrx/store": "21.1.1",
      "rxjs": "^6.5.3 || ^7.5.0"
    }
  }
}
```

Decision: target Angular 21 for implementation. Angular 22 remains deferred until NgRx publishes compatible peer dependencies.
