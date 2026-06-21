# SES production access appeal packet

Prepared: 2026-06-21 04:00 CT

## Current SES state

- Region: `us-east-1`
- SES identity: `notificaciones.moyra.org`
- MAIL FROM: `bounce.notificaciones.moyra.org`
- Sending domain status: verified
- DKIM status: success
- Custom MAIL FROM status: success
- Account status: healthy
- Production access: denied
- SES case id: `178199358800446`
- Notifications remain disabled in backend runtime: `CASE_EMAIL_NOTIFICATIONS_ENABLED=false`

## Public site evidence

- Business website: `https://moyra.org`
- Contact page: `https://moyra.org/contacto`
- Privacy notice: `https://moyra.org/aviso-de-privacidad`
- Private client portal entry: `https://moyra.org/casos`

## Appeal text

Subject:

```text
Appeal for Amazon SES production access for transactional legal case notifications
```

Message:

```text
Hello AWS SES team,

We are appealing the production access denial for SES case 178199358800446.

Moyra is the web application for Montaño & Reyes Arrazola S.C., a legal services firm operating at https://moyra.org. We request SES production access in us-east-1 for low-volume transactional email notifications sent from casos@notificaciones.moyra.org.

The domain identity notificaciones.moyra.org is verified in SES, DKIM signing is successful, and the custom MAIL FROM domain bounce.notificaciones.moyra.org is configured successfully. The public website now includes a contact page at https://moyra.org/contacto and a privacy notice at https://moyra.org/aviso-de-privacidad describing the private case portal and transactional notifications.

Our email use case is transactional only. Recipients are clients, attorneys, interns, or authorized staff who are invited to a private legal case in the authenticated portal. Emails are triggered by private case events such as invitations, comments, approved file visibility, status changes, and security/account events. We do not send marketing email, newsletters, purchased-list campaigns, lead-generation campaigns, or bulk promotional email through this identity.

Message content will contain safe summaries and authenticated links to the private case portal. We will not include confidential legal documents or full privileged legal details in email bodies. Users must sign in to access case content based on their case membership and permissions.

Bounce and complaint handling is enabled through SES account suppression for BOUNCE and COMPLAINT. The application also includes a notification preferences center so authorized users can manage case notification channels when email sending is enabled after approval.

Production email sending remains disabled in the application until AWS approves SES production access. We are requesting production access now so we can safely activate transactional case notifications for authenticated users in a controlled rollout.

Thank you.
```

## Do not enable before approval

- Keep `CASE_EMAIL_NOTIFICATIONS_ENABLED=false`.
- Do not send customer notifications from SES sandbox mode.
- After approval, enable first in `test`, send one controlled notification to an authorized address, verify delivery/bounce behavior, then enable production.
