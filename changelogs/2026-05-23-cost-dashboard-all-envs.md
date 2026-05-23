# 2026-05-23 Cost Dashboard All Environments

## Summary

- `/admin/uso` now presents Moyra AWS costs by `production`, `test`, and `development`.
- The main total is a programmatic Moyra-resource estimate, not a raw Cost Explorer account total.
- EC2 is intentionally excluded because the frontend runs on Alec's personal server.
- The dashboard explains each AWS service in plain language for non-technical admin users.
- AI usage now shows the monthly token limit, approximate monthly cap cost, and used token cost.
- Web research is hidden in the Bedrock first pass.
- Tiny non-zero costs render as `< USD 0.0001` instead of looking like `USD 0.00`.

## Verification

- Frontend targeted tests: `TOTAL: 5 SUCCESS`.
- Frontend build: `npm run build` completed successfully.
- Test browser audit on `https://test.moyra.org/admin/uso` after authenticated refresh:
  - `Estado: refreshed`
  - Development local, Producción, and Testing visible
  - No `EC2 - Other`
  - No `AWS WAF`
  - No `USD -0.00`
  - No `test.moyra.org` console warnings/errors

## Bedrock Nova Finding

- AWS Service Quotas in `us-east-1` returned `0` and non-adjustable for regional Amazon Nova Micro daily tokens and tokens per minute.
- The open quota request is for cross-region Amazon Nova Lite, but the app keeps cross-region disabled for cost control.
- The next AWS action is to enable/request the regional on-demand quota or model access for the exact model configured by the app, or deliberately change the app model only after AWS approves a different regional model.
