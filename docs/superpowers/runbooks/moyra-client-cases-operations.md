# Moyra Client Cases Operations Runbook

**Scope**: Day-2 operation for the private `Casos` module after the production feature rollout.

## Daily Checks

- Open `/admin/casos` and review the operations summary.
- Review `Archivo pendiente` and `Carga pendiente` before approving document visibility.
- Review `Push fallidos` only after Web Push is intentionally enabled.
- Keep public Publications checks separate; private case content must never appear in public aggregate routes.

## File Review States

- `pending_upload`: the file metadata exists but upload completion has not been confirmed.
- `pending`: the file is uploaded but not yet approved for external/client visibility.
- `approved`: the file can be shown to authorized external case members when its visibility also allows case members.
- `restricted` or `rejected`: the file should stay internal unless a later attorney/admin decision changes it.

## External Malware Scanning

External malware scanning is outside the current `Casos` release. Do not add provider-specific upload scanning controls, flags, or activation steps to the frontend until that work is planned as a separate cost-gated feature.

## Web Push

- Store only the VAPID public key in frontend config.
- Store the VAPID private key in AWS Secrets Manager.
- Backend deployment uses `CASE_WEB_PUSH_SUBJECT`, `CASE_WEB_PUSH_PUBLIC_KEY`, and `CASE_WEB_PUSH_PRIVATE_KEY_SECRET_ARN`.
- Do not use `CASE_WEB_PUSH_PRIVATE_KEY` in GitHub Actions or CDK context.
- First rollout should keep `caseServiceWorkerEnabledHosts=['test.moyra.org']`.

## Email

- Email notifications remain separate from Web Push.
- Keep `CASE_EMAIL_NOTIFICATIONS_ENABLED=false` until SES production access or the approved Microsoft Graph path is ready.
