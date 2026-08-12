# Plan: Moyra Frontend Lambda SSR With EC2 Proxy

**Updated**: 2026-07-09 CT
**Estimated complexity**: Medium
**Chosen path**: Lambda SSR + tiny EC2 reverse proxy + Microsoft DNS A records

## Overview

Moyra cannot move authoritative DNS away from Microsoft and the apex `moyra.org` can only point to IP addresses through `A` records. Because CloudFront apex without Route 53 needs expensive Anycast static IPs, the cheaper path is:

```text
moyra.org / www.moyra.org / test.moyra.org
  -> Microsoft DNS A record
  -> Elastic IP
  -> small EC2 proxy
  -> API Gateway REST API allowlisted to the proxy EIP
  -> Lambda running Angular SSR
  -> existing serverless API at api.moyra.org / api.test.moyra.org
```

This is not a redirect. A redirect would expose the Lambda/CloudFront URL and lose `moyra.org`. The EC2 box must be a reverse proxy so the browser stays on `https://moyra.org`.

Use the portfolio workflow only where it pays off: immutable frontend artifacts, release IDs, GitHub OIDC publishing, and infra-owned AWS resources. Do not copy the CloudFront/Route 53 shape because Moyra DNS cannot use it.

## Current Evidence

- AWS CLI profile: `ADMIN-AIM-CLI` verified with STS as account `765932874577`, ARN `arn:aws:iam::765932874577:user/ADMIN-AIM-CLI`.
- Current host: EC2 `i-061f471ff5edea8a9`, running `t3.medium`, Linux/x86_64, public IP `32.195.120.158`.
- Current EIP: `eipalloc-0306e8f93df10d5c8`, associated to `i-061f471ff5edea8a9`.
- Current disk: `vol-0bd5f763909f1383b`, 120 GB gp3, `Encrypted=false`.
- Current security group: `sg-08e840425cfd87d3e`; inbound 80/443 are public, while SSH and admin/database-style ports are restricted to specific IPs.
- AWS Price List via `ADMIN-AIM-CLI`, publication `2026-07-08T22:21:28Z`, returned:
  - `t3.medium=$0.0416/h`
  - `t4g.nano=$0.0042/h`
  - `t4g.micro=$0.0084/h`
  - `t4g.small=$0.0168/h`
- Frontend repo has Angular SSR in `src/server.ts`, static serving from `dist/.../browser`, and a Dokploy/Traefik header workaround that deletes `x-forwarded-*` headers.
- API host mapping already supports `moyra.org`, `www.moyra.org`, and `test.moyra.org` in `src/app/services/global.ts`.

## Target Architecture

### EC2 Proxy

- Instance: `t4g.micro` ARM64 first.
- Disk: 20 GB gp3, encrypted.
- Access: SSM Session Manager first; SSH closed unless explicitly needed.
- Network: security group inbound only 80/443 from `0.0.0.0/0`.
- Public IP: one Elastic IP.
- Proxy software: Caddy for the first cut because it handles TLS renewal with less moving parts.
- Proxy target: API Gateway REST API for SSR.

Do not use ALB, Global Accelerator, or CloudFront Anycast in the first cut.

### IaC Boundary

The EC2 proxy should be reproducible from IaC. No hand-maintained server state.

CDK owns:

- EC2 instance, AMI lookup, instance type, encrypted root volume, tags.
- Elastic IP and association.
- Security group with only 80/443 public ingress.
- IAM instance role for SSM.
- API Gateway REST API, Lambda integration, and source-IP resource policy.
- SSM parameters for the upstream API Gateway URL and proxy IP.
- SSM association for Caddy install/config drift repair.
- CloudWatch log groups and retention.

Bootstrap owns:

- Install Caddy.
- Write the Caddyfile through user data and the SSM association.
- Enable and restart Caddy with systemd.
- Create `/healthz`.

Use CDK user data for first boot and SSM State Manager association for repeatable Caddy config. Manual SSH/SSM changes are allowed only for break-glass debugging, then backported to IaC.

### Lambda SSR

- Runtime: Node.js 22.x unless the current Angular build forces another supported runtime.
- Package: SSR server plus browser output in one zip for the first cut.
- Endpoint: Lambda behind API Gateway REST API.
- Security: API Gateway resource policy allows requests only from the EC2 proxy Elastic IP.
- Headers: preserve the public host/proto from the EC2 proxy so SSR renders as `https://moyra.org`, not as the API Gateway hostname.

AWS docs explicitly document REST API resource policies that allow or deny API invocation by source IP address. That avoids a local SigV4 signer and avoids a public unauthenticated Lambda Function URL.

### Origin Security Mitigation

Default:

```text
Caddy :443
  -> API Gateway REST API
  -> Lambda SSR
```

Implementation rules:

- EC2 has a fixed Elastic IP.
- API Gateway REST API has a resource policy that denies all `execute-api:Invoke` traffic except the proxy EIP.
- Caddy terminates TLS and reverse proxies to the API Gateway invoke URL.
- Direct internet calls to the API Gateway URL from any other source IP return `403` before Lambda SSR runs.
- Lambda does not expose a Function URL.

Fallbacks only if needed:

- If source-IP policy is not enough for a future requirement, add IAM auth or a Lambda authorizer to API Gateway.
- If API Gateway is rejected, return to Function URL `AWS_IAM` plus a localhost SigV4 signer.
- Use shared-secret `AuthType NONE` only as last fallback.

### Static Assets

First cut: let the Lambda package serve static browser assets through the existing Express static middleware.

Skipped for first cut: S3 static split and CDN cache. Add later only if Lambda metrics show asset traffic is a real cost/latency problem.

## Sprint 0: Freeze DNS And Cost Decision

**Goal**: Lock the new direction before building.

Tasks:

- Record the selected direction: `EC2 proxy -> Lambda SSR`.
- Keep Microsoft authoritative DNS unchanged.
- Keep old A record target `32.195.120.158` as rollback.
- Export Microsoft DNS records before any change, especially Microsoft 365, SES, ACM, SPF/DKIM/DMARC/MX/SRV records.

Validation:

- `Resolve-DnsName` inventory saved.
- Microsoft portal DNS export/manual inventory saved.
- Alec approves no CloudFront Anycast, no Global Accelerator, no ALB for v1.

## Sprint 1: Frontend Lambda Artifact

**Goal**: Make `moyra-front-angular` produce a Lambda SSR package without touching live traffic.

Tasks:

- Add `serverless-http` only if needed by the Lambda adapter.
- Add `tools/package-ssr-lambda.mjs`, adapted from `lynx-portfolio-angular`.
- Add `npm run package:ssr:lambda`.
- Package both server output and browser output into the zip for v1.
- Write `manifest.json` with app, environment, release ID, commit, runtime, artifact keys, and checksum.

Required code adjustment:

- Change `src/server.ts` so the Dokploy `x-forwarded-*` deletion remains for Dokploy, but API Gateway proxy mode can trust the EC2 proxy headers.

Validation:

- `npm run build`
- `npm test -- --watch=false --browsers=ChromeHeadless`
- `npm audit --omit=dev --audit-level=moderate`
- `npm run package:ssr:lambda`

## Sprint 2: Infra Lambda SSR

**Goal**: Deploy Lambda SSR in `moyra-infra-serverless` without public DNS cutover.

Tasks:

- Add frontend artifact config per environment: `test`, `production`.
- Add Lambda SSR consuming the published zip.
- Add API Gateway REST API integrating to the Lambda SSR function.
- Add an API Gateway resource policy that allows only the proxy EIP for that environment.
- Do not add a Lambda Function URL in the default path.
- Keep `MOYRA_PROXY_SECRET` only as a last fallback option, not the default.
- Add bounded CloudWatch log retention.
- Add CDK tests for no broad secret exposure and no wildcard artifact writes.

Security rule:

- Direct API Gateway requests from non-proxy source IPs must return `403`.
- Lambda must not have a public Function URL.
- If fallback secret mode is used, the secret must not be present in frontend browser bundles, public manifests, GitHub logs, or CloudFormation outputs.

Validation:

- CDK synth/test passes.
- Direct API Gateway invoke URL from this machine returns `403` after source-IP policy is active.
- API Gateway request from the EC2 proxy EIP with forwarded host headers returns SSR HTML.

## Sprint 3: EC2 Proxy Foundation

**Goal**: Create the small IP front door without changing production traffic.

Tasks:

- Create a new `t4g.micro` EC2 instance, encrypted 20 GB gp3.
- Attach an IAM role for SSM only; no static AWS keys on the instance.
- Allocate and attach a new Elastic IP.
- Install Caddy through CDK user data and SSM association.
- Configure Caddy:
  - listen on 80/443
  - obtain TLS for `test.moyra.org` first
  - reverse proxy to the API Gateway REST invoke URL
  - send original host/proto headers
  - expose local `/healthz`
- Keep old EC2 and old EIP untouched.

Validation:

- SSM access works.
- `curl http://<new-eip>/healthz` returns healthy.
- Proxy logs show Lambda upstream responses.
- Security group exposes only 80/443.
- Direct API Gateway calls from outside the proxy EIP return `403`.
- Recreating the EC2 instance from the CDK stack produces a working proxy without manual server steps.

## Sprint 4: Test Cutover

**Goal**: Prove the full path on `test.moyra.org`.

Tasks:

- Change only Microsoft DNS `A test.moyra.org` to the new proxy EIP.
- Let Caddy issue TLS for `test.moyra.org`.
- Smoke public pages and admin flows.
- Verify API remains `https://api.test.moyra.org/api/v2`.
- Verify Cognito/login/refresh/cookies.
- Verify current JS asset marker, not only `/healthz`.

Validation:

- `https://test.moyra.org/`
- `/blog`
- `/publications`
- `/admin`
- `/casos` if applicable
- static JS/CSS
- `https://api.test.moyra.org/api/v2/health`
- browser console has no unexpected errors

Rollback:

- Restore `test.moyra.org A 32.195.120.158`.

## Sprint 5: Production Cutover

**Goal**: Move production after test is proven.

Tasks:

- Confirm current production artifact/release ID.
- Change Microsoft DNS:
  - `A moyra.org -> new proxy EIP`
  - `A www.moyra.org -> new proxy EIP`
- Let Caddy issue TLS for production domains.
- Smoke public and authenticated flows.
- Watch Lambda errors, EC2 CPU/RAM, Caddy logs, and API auth errors.

Validation:

- `https://moyra.org/`
- `https://www.moyra.org/`
- `/blog`
- `/publications`
- `/admin`
- login/refresh/logout
- production API health
- current JS asset marker

Rollback:

- Restore `moyra.org` and `www.moyra.org` A records to `32.195.120.158`.

## Sprint 6: Observation And Cleanup

**Goal**: Remove old Moyra frontend dependency only after the new path survives real traffic.

Tasks:

- Observe 24-72 hours.
- Compare Lambda duration/errors and EC2 proxy memory/CPU.
- Keep old Dokploy app available during the rollback window.
- Stop/remove only the old Moyra frontend after approval.
- Do not touch unrelated apps on the old shared EC2.

Optional later:

- Downgrade proxy to `t4g.nano` only if metrics prove memory is stable.
- Add S3/static split only if Lambda static asset traffic becomes meaningful.
- Add reserved instance/savings plan only after the architecture is stable.

## Cost Direction

Current host compute is `t3.medium=$0.0416/h`, about `$30.37/month` before disk, IPv4, transfer, logs, snapshots, and taxes.

Target proxy compute is `t4g.micro=$0.0084/h`, about `$6.13/month` before disk, IPv4, transfer, logs, snapshots, and taxes.

Using the earlier gp3 and IPv4 assumptions already recorded in `Codex.md`, `t4g.micro + 20 GB gp3 + one public IPv4` is about `$11.38/month` before extras. The current host also has a 120 GB gp3 disk, so the proxy path should materially reduce both compute and disk cost.

## Risks

- API Gateway REST API adds per-request cost, but no fixed monthly charge. At low Moyra traffic this should be materially cheaper than ALB/Global Accelerator/CloudFront static IPs.
- Source-IP allowlisting depends on the proxy Elastic IP. If the EIP changes, update the API Gateway resource policy before moving traffic.
- Caddy will not get a valid public certificate until DNS points the domain to the proxy.
- The current SSR server deletes `x-forwarded-*` headers; Lambda proxy mode needs a safe exception.
- If all static assets go through Lambda, asset traffic may increase Lambda invocations. Measure before adding S3/CDN complexity.
- EC2 remains on the request path, so OS patching, TLS renewal, logs, and security group hygiene still matter.
- The current old root volume is unencrypted; do not copy that pattern.
