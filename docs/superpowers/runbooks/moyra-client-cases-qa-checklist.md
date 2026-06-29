# Moyra Casos QA Checklist

**Scope**: Manual QA for the private `Casos` module before production promotion.  
**Environment**: Start with `https://test.moyra.org`. Do not promote to production from this checklist.  
**Created**: 2026-06-24 23:06 CT.  
**Owner review**: Hugo/Alec.  

## QA Session Metadata

- [ ] Tester:
- [ ] Date/time, Central Time:
- [ ] Frontend branch/commit:
- [ ] Backend branch/commit:
- [ ] Test bundle served by `https://test.moyra.org`:
- [ ] Browser and version:
- [ ] Viewports tested:
  - [ ] Mobile, around 390px wide.
  - [ ] Tablet, around 768px wide.
  - [ ] Desktop, 1280px or wider.
- [ ] Evidence folder or screenshots:
- [ ] Blocking issues found:
- [ ] Non-blocking improvements requested:

## Release Posture

- [ ] Confirm production is not being promoted during this QA pass.
- [ ] Confirm `test` is the only browser environment under review.
- [ ] Confirm public `Publicaciones` behavior is unchanged.
- [ ] Confirm public test content is present after the 2026-06-28 nonproduction sync incident: `/api/v2/publications` includes `Publicación de prueba` and `/api/v2/articles` includes `Artículo Test`.
- [ ] Confirm the nonproduction sync guard is deployed so an empty production public source cannot replace public test content.
- [ ] Confirm private `Casos` content is not public and has no SEO/public publication metadata.
- [ ] Confirm `CASE_EMAIL_NOTIFICATIONS_ENABLED=false` unless SES production access has been approved.
- [ ] Confirm `CASE_WEB_PUSH_ENABLED=false` unless Web Push runtime secrets and frontend public key are configured.
- [ ] Confirm external malware scanning/GuardDuty UI is not present in the current release.
- [ ] Confirm PITR/backup retention and DynamoDB backup cost are accepted for public content tables before relying on point-in-time restore as the recovery path.

## Latest Automated Verification

- [x] 2026-06-29 01:07 CT: `npm test -- --watch=false --browsers=ChromeHeadless --no-progress` returned `167 SUCCESS`.
- [x] 2026-06-29 01:09 CT: `npm run build` completed successfully.
- [ ] Production budget warnings remain open: initial bundle is 15.85 kB over 1.12 MB, `admin-case-detail.component.ts` SCSS is 742 bytes over 4.00 kB, `admin-cases-list.component.ts` SCSS is 75 bytes over 4.00 kB, and `case-detail.component.ts` SCSS is 1.10 kB over 4.00 kB.

## Test Personas

Prepare these users or equivalent temporary users:

- [ ] Attorney/admin user with case management access.
- [ ] Pasante/internal collaborator user.
- [ ] External client A.
- [ ] External client B.
- [ ] External observer, if observer access is being reviewed.
- [ ] Logged-out/anonymous browser session.

Prepare this test data:

- [ ] At least one case assigned to client A.
- [ ] At least two cases assigned to the same client, to validate multi-case navigation.
- [ ] At least one case shared with multiple external members.
- [ ] At least one case not assigned to client A, to validate access denial.
- [ ] At least one attorney-defined case type with custom statuses.
- [ ] At least one case entry visible to case members.
- [ ] At least one internal-only entry or comment.
- [ ] At least one OneDrive/SharePoint document link pending or restricted from external visibility.
- [ ] At least one OneDrive/SharePoint document link approved for external visibility.

## Public Site Regression

Verify public pages still work and do not leak private case data.

- [ ] `/`
- [ ] `/publications`
- [ ] `/blog`
- [ ] `/soluciones`
- [ ] `/contacto`
- [ ] `/aviso-de-privacidad`

For each public page:

- [ ] Page loads without auth.
- [ ] No case titles, case ids, references, comments, file names, client emails, or notifications are visible.
- [ ] No private case routes appear in visible public navigation unless the user is authenticated and the environment allows it.
- [ ] No public SEO title/description/canonical includes private case data.
- [ ] Browser console has no unexpected errors.
- [ ] Mobile view has no horizontal overflow or text overlap.

## Login

- [ ] `/login` renders a real login form.
- [ ] Email input is labeled or otherwise accessible.
- [ ] Password input is inside the login form.
- [ ] Submit button has `type="submit"`.
- [ ] Login with valid client credentials redirects to the intended private route when `returnUrl=/casos`.
- [ ] Login with admin credentials still reaches admin flow correctly.
- [ ] Login failure shows a safe error and does not reveal account existence details.
- [ ] Logout clears local/session auth state.
- [ ] A logged-out user opening `/casos` is redirected to `/login?returnUrl=...`.
- [ ] Browser console does not show the password-field-not-in-form warning.

## Client Cases List - `/casos`

As a client with assigned cases:

- [ ] List loads only the cases assigned to that client.
- [ ] If the client has multiple cases, each appears as a separate row/card.
- [ ] Case reference is visible when present.
- [ ] Case title wraps without horizontal overflow.
- [ ] Status label uses attorney-defined status text.
- [ ] Last activity is visible and understandable.
- [ ] Unread count is visible and matches notifications.
- [ ] `Abrir caso` or `Revisar novedades` navigates to the correct case.
- [ ] `Notificaciones` navigates to notification center.
- [ ] Empty state is clear for a client with no assigned cases.
- [ ] Loading state is visible and does not jump layout badly.
- [ ] Error state provides a retry action.
- [ ] Fixed header/footer do not cover the first or last content.
- [ ] Mobile view has no horizontal overflow.
- [ ] Visible buttons/links have readable names.

Negative checks:

- [ ] Client A does not see client B-only cases.
- [ ] Removed member does not see removed cases.
- [ ] Logged-out user cannot see the list.

## Client Case Detail - `/casos/:caseId`

As a member client:

- [ ] Case reference/title render correctly.
- [ ] Long case title wraps without overflow.
- [ ] Visible entries appear in chronological/expected order.
- [ ] Internal-only entries do not appear for external clients.
- [ ] Entry titles are links, not button-styled blocks.
- [ ] Entry title links wrap long text and have no bordered button styling.
- [ ] Entry body rich text renders safely.
- [ ] Comments section appears under each visible entry.
- [ ] Existing visible comments appear.
- [ ] Internal-only comments do not appear for external clients.
- [ ] Comment textarea has a visible label: `Escribe un comentario`.
- [ ] Comment textarea has a stable `id`.
- [ ] Comment textarea has a DOM `name` beginning with `comment-`.
- [ ] Comment submit button is disabled only when permission or busy state requires it.
- [ ] Submitting a comment appends the comment in the UI.
- [ ] Submitted comment persists after reload.
- [ ] Browser console has no errors during comment submit.
- [ ] Documents panel appears.
- [ ] OneDrive/SharePoint link form is labeled.
- [ ] Client can add document links only if they have `case.upload_file`.
- [ ] Pending or restricted external document link from current client is visible to that same client with the expected review label.
- [ ] Pending or restricted external document link from another external client is hidden until approved.
- [ ] Approved document link is visible/openable to authorized client.
- [ ] Fixed footer does not cover document/link controls at the bottom.
- [ ] Mobile view has no horizontal overflow.

Negative checks:

- [ ] Client without `case.comment` sees comments disabled.
- [ ] Client without `case.upload_file` sees document link creation disabled/unavailable.
- [ ] Non-member opening a guessed case id receives denial or not-found behavior.
- [ ] Removed member cannot read, comment, add document links, or open document links.

## Case Entry Detail - `/casos/:caseId/entrada/:entryId`

- [ ] Back link returns to the parent case.
- [ ] Entry id/reference is visible.
- [ ] Long entry title wraps.
- [ ] Entry body renders safely.
- [ ] Visible comments render.
- [ ] Internal-only comments are hidden from external clients.
- [ ] Missing or unauthorized entry shows a safe not-found message.
- [ ] Fixed footer does not cover the last comments block.
- [ ] Mobile view has no horizontal overflow.
- [ ] No publication routes or SEO/public URLs are present.

## Client Notifications - `/notificaciones`

- [ ] Notification center loads for authenticated case user.
- [ ] Only notifications for that user are visible.
- [ ] New case entry creates an in-app notification for other active members.
- [ ] New client comment creates the expected in-app notification for eligible recipients.
- [ ] Notification title/body are safe summaries, not full confidential legal content.
- [ ] Notification links route to authenticated case pages.
- [ ] Mark one notification as read updates UI state.
- [ ] Mark all as read updates unread count.
- [ ] Empty state is clear.
- [ ] Browser console has no unexpected errors.
- [ ] Mobile view has no horizontal overflow.

## Notification Preferences - `/notificaciones/preferencias`

- [ ] Page loads for authenticated case user.
- [ ] Email preferences show unavailable/disabled state while email delivery is disabled.
- [ ] Web Push preferences show unavailable/disabled state while Web Push is disabled.
- [ ] Toggling unavailable delivery modes is blocked or clearly unavailable.
- [ ] Saved preference changes persist where enabled.
- [ ] No VAPID private key or secret value is exposed in the browser.
- [ ] Browser console has no unexpected errors.

## Admin Cases List - `/admin/casos`

As admin/attorney:

- [ ] Page loads only for admin/internal authorized users.
- [ ] Non-admin client cannot access admin cases.
- [ ] Cases summary/operations data renders if available.
- [ ] Case list is scannable on desktop.
- [ ] Case list remains usable on mobile.
- [ ] Creating a new case works with selected case type and status.
- [ ] Attorney-defined statuses are available.
- [ ] Case lead/owner selection works if exposed.
- [ ] Search/filter/sort controls work if present.
- [ ] No GuardDuty/malware scan launch UI is present.
- [ ] Browser console has no unexpected errors.

## Admin Case Detail - `/admin/casos/:caseId`

- [ ] Admin can open a case from the list.
- [ ] Admin can see case metadata.
- [ ] Admin can change case status according to allowed workflow.
- [ ] Admin can add public-to-case-member entry.
- [ ] Admin can add internal-only entry.
- [ ] Admin can see internal-only entries.
- [ ] Admin can see all case members.
- [ ] Admin can add existing user as member.
- [ ] Admin can invite a new user by email if invites are enabled.
- [ ] Invited/added member receives correct role preset.
- [ ] Admin can update member permissions.
- [ ] Admin can remove member access.
- [ ] Removed member loses access after refresh.
- [ ] Admin can view audit events if permission allows.
- [ ] Admin can approve or restrict external file visibility.
- [ ] Browser console has no unexpected errors.
- [ ] Mobile layout remains usable.

## Admin Case Configuration

For case type/status administration:

- [ ] Admin can create a case type.
- [ ] Admin can edit case type name/description.
- [ ] Admin can define custom statuses.
- [ ] Admin can reorder statuses if the UI exposes ordering.
- [ ] Admin can set a default status.
- [ ] Status labels are attorney-defined and not hard-coded to one legal workflow.
- [ ] Deactivating a status or type behaves safely.
- [ ] Existing cases using older statuses remain understandable.
- [ ] Non-admin users cannot manage case types/statuses.

## Permissions Matrix

Validate each permission by both UI and API behavior where feasible.

- [ ] `case.read`: can list/open assigned case.
- [ ] `case.comment`: can submit comments.
- [ ] `case.upload_file`: can add OneDrive/SharePoint document links.
- [ ] `case.download_file`: can open authorized document links.
- [ ] `case.write_entry`: can create/update entries only if intended.
- [ ] `case.manage_members`: can add/remove members only if intended.
- [ ] `case.manage_permissions`: can change permissions only if intended.
- [ ] `case.manage_status`: can change status only if intended.
- [ ] `case.approve_file_visibility`: can approve external visibility only if intended.
- [ ] `case.read_audit`: can view audit only if intended.
- [ ] `case.manage_case_type`: can manage case types/statuses only if intended.
- [ ] `case.manage_notifications`: can manage notification operations only if intended.

Negative checks:

- [ ] Frontend hiding is not treated as security; direct API calls without permission fail.
- [ ] Guessing another case id fails.
- [ ] Guessing another file id fails.
- [ ] Guessing another entry id fails.
- [ ] Removed or inactive memberships fail closed.

## Case Document Links

- [ ] Link creation accepts HTTPS OneDrive or SharePoint URLs.
- [ ] Link creation rejects unsupported or non-HTTPS URLs safely.
- [ ] Failed link creation shows retryable error.
- [ ] Stale pending/restricted document links do not appear as approved.
- [ ] New document link starts with the selected visibility and review state.
- [ ] Internal users can see pending external review queue if exposed.
- [ ] Other external members cannot see a restricted document link until approval.
- [ ] Approved document link becomes visible to authorized external members.
- [ ] Restricted/rejected document link is not visible to unauthorized external users.
- [ ] Document links open in a new tab with `rel="noopener noreferrer"`.
- [ ] Microsoft link permissions are reviewed outside Moyra before sharing; Moyra stores and opens the link but does not enforce Microsoft-side access.

## Accessibility And Layout

For every reviewed screen:

- [ ] One clear page-level heading.
- [ ] Form controls have labels or accessible names.
- [ ] Buttons and links have readable names.
- [ ] Keyboard tab order is usable.
- [ ] Focus states are visible.
- [ ] Modals/alerts do not trap focus incorrectly.
- [ ] Long words, case references, emails, and file names wrap.
- [ ] No text overlaps buttons, headers, footers, or adjacent cards.
- [ ] No horizontal overflow on mobile.
- [ ] Fixed header/footer never cover interactive controls.
- [ ] Loading, empty, success, and error states are readable.

## Security And Privacy

- [ ] Case pages require authentication.
- [ ] Case data is never rendered in public pages.
- [ ] Case entries are not treated as public publications.
- [ ] Case entries have no SEO title, SEO description, canonical URL, slug, or public URL.
- [ ] Safe rich HTML rendering blocks unsafe scripts.
- [ ] Notifications contain safe summaries and authenticated links only.
- [ ] Email delivery remains off unless SES production access and DNS are approved.
- [ ] Web Push remains off unless backend secret handling is configured.
- [ ] Browser local/session storage does not expose sensitive legal content beyond auth/session needs.
- [ ] No credentials, VAPID private keys, AWS secrets, or SES secrets are exposed in frontend bundles.
- [ ] Browser console/network logs do not expose full confidential case content in avoidable errors.

## Cost Controls

- [ ] Do not enable GuardDuty/malware scanning in this release.
- [ ] Do not enable SES production email until AWS approval and DNS plan are complete.
- [ ] Do not enable Web Push until VAPID secret storage and delivery tests are complete.
- [ ] Do not add new AWS services during QA without explicit cost review.
- [ ] Record any new cost-bearing recommendation before implementation.

## Browser Console And Network

For each critical workflow:

- [ ] No uncaught JavaScript exceptions.
- [ ] No unexpected `4xx` or `5xx` API calls.
- [ ] Expected unauthenticated refresh `401` appears only on logged-out pages.
- [ ] API calls use `Authorization` for private case endpoints.
- [ ] Private case endpoints are not called from public pages.
- [ ] OneDrive/SharePoint URLs are not echoed into public routes, SEO metadata, or avoidable error messages.

## Cleanup After QA

- [ ] Delete temporary Cognito users created for QA.
- [ ] Delete temporary case notifications.
- [ ] Delete temporary case audit events only if policy allows cleanup for synthetic test data.
- [ ] Delete temporary comments.
- [ ] Delete temporary entries.
- [ ] Delete temporary memberships.
- [ ] Delete temporary cases.
- [ ] Delete temporary case types if no longer needed.
- [ ] Delete temporary OneDrive/SharePoint document links created for QA.
- [ ] Confirm cleanup errors are recorded as `[]` or list exact unresolved cleanup items.

## QA Result

- [ ] Approved for another test iteration.
- [ ] Approved for production planning, but not promoted yet.
- [ ] Blocked by findings.

Findings:

| ID | Screen | Severity | Finding | Expected | Actual | Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |  |  |

Decision:

- [ ] Keep in test.
- [ ] Request fixes before more QA.
- [ ] Prepare production promotion checklist separately.
