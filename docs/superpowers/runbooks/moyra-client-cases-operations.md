# Moyra Client Cases Operations Runbook

**Scope**: Day-2 operation for the private `Casos` module after the production feature rollout.

## Daily Checks

- Open `/admin/casos` and review the operations summary.
- Investigate any `Bloqueados` count above 0 before approving document visibility.
- Review `Escaneo pendiente` for files that stay pending longer than the expected GuardDuty scan window.
- Review `Push fallidos` only after Web Push is intentionally enabled.
- Keep public Publications checks separate; private case content must never appear in public aggregate routes.

## File Security States

- `not_required`: malware enforcement is disabled for this file.
- `pending`: GuardDuty has not produced a clean result yet; download and external approval stay blocked.
- `clean`: GuardDuty returned `NO_THREATS_FOUND`; download and external approval are allowed by normal permissions.
- `blocked`: GuardDuty returned `THREATS_FOUND`; do not approve externally.
- `unsupported`, `access_denied`, `failed`: treat as blocked until the cause is investigated.

## Activation Order

1. Confirm GuardDuty Malware Protection for S3 is deployed for the uploads bucket prefix `cases/` with tagging enabled.
2. Set `CASE_UPLOAD_MALWARE_SCANNING_ENABLED=true` only in the intended environment so the product can detect GuardDuty availability.
3. Open `/admin/casos` as the Moyra admin/attorney, review the GuardDuty cost notice, check `Acepto el costo`, and click `Lanzar protección`.
4. Upload a test case document in test.
5. Confirm the object receives `GuardDutyMalwareScanStatus=NO_THREATS_FOUND`.
6. Verify pending/threat statuses block download and clean status allows download.
7. Review Cost Explorer/GuardDuty usage, then repeat only after approval for production.

## Web Push

- Store only the VAPID public key in frontend config.
- Store the VAPID private key in AWS Secrets Manager.
- Backend deployment uses `CASE_WEB_PUSH_SUBJECT`, `CASE_WEB_PUSH_PUBLIC_KEY`, and `CASE_WEB_PUSH_PRIVATE_KEY_SECRET_ARN`.
- Do not use `CASE_WEB_PUSH_PRIVATE_KEY` in GitHub Actions or CDK context.
- First rollout should keep `caseServiceWorkerEnabledHosts=['test.moyra.org']`.

## Email

- Email notifications remain separate from Web Push.
- Keep `CASE_EMAIL_NOTIFICATIONS_ENABLED=false` until SES production access or the approved Microsoft Graph path is ready.
