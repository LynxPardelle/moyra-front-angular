# 2026-05-23 Bedrock Model And Budget Update

## Summary

- Added `AI21 Jamba 1.5 Mini` to the admin AI model catalog.
- Changed the prepared default model to `ai21.jamba-1-5-mini-v1:0`.
- Raised the app monthly token budget to `16,666,666` tokens.
- Set the testing AWS Budget variable to `USD 5`, equivalent to roughly `MXN 100` at `USD 1 = MXN 20`.

## Verification

- Direct regional Bedrock `Converse` tests were attempted for Nova, Claude Haiku, Llama 3 8B, Mistral 7B, AI21 Jamba Mini, Cohere Command R, OpenAI GPT OSS, Gemma, Ministral, and GLM.
- All invocation attempts still failed with daily token quota throttling, so the account still needs AWS quota/model enablement before real generation works.
- Frontend targeted tests passed: `TOTAL: 11 SUCCESS`.
- Frontend build passed.
- API Lambda tests passed: `37/37`.
- CDK stack tests passed: `16/16`.
- `cdk synth` passed.
