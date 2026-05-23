# 2026-05-23 - Nova budget and Cost Explorer accounting

## Changes

- Switched the prepared Bedrock fallback/default model back to `amazon.nova-micro-v1:0`.
- Reduced the monthly application token budget to `15,000,000` tokens.
- Kept the Bedrock AWS budget alert target at `USD 5.00` for the account-level guardrail.

## Cost audit notes

- Cost Explorer API refreshes should be represented as an explicit dashboard cost at `USD 0.01` per successful refresh for the selected range.
- Production Lambda invocations for `2026-05-01` through `2026-05-23` were verified against CloudWatch. The high total was mostly public API traffic on `GET /api/v2/main`, `GET /api/v2/publications`, `GET /api/v2/articles`, and `GET /api/v2/services`.
