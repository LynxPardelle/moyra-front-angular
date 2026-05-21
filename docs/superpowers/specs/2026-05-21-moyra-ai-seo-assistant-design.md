# Moyra AI SEO Assistant - Phase 2 Design

Date: 2026-05-21 CT
Status: Proposed for review
Scope: Phase 2, Option 1 implementation first; cost/usage dashboard and opt-in web research included; Options 2 and 3 documented as future releases.

## Summary

Phase 1 is considered complete: blog, publications, solutions, configuration editing, rich text, secure embeds, file previews, admin auth, and extended sessions are live in testing and production.

Phase 2 will start with a polished AI editorial assistant for admins. The assistant will help attorneys improve SEO and content quality across Blog, Publicaciones, Soluciones, and Configuraciones. The first release must be cost-controlled, safe, and useful after a few weeks of real usage data. It will not publish automatically. It will generate suggestions that the attorney can review, edit, and explicitly apply.

This phase also includes an admin usage/cost dashboard. The dashboard must show AI usage, estimated AI spend, model pricing, optional web research spend, and high-level AWS service cost visibility. The implementation should still avoid OpenSearch and any broad retrieval architecture in this first increment.

## Goals

- Help attorneys create better SEO content without leaving the admin editor.
- Make Blog, Publications, Solutions, and Configurations feel like one coherent content platform.
- Generate practical suggestions: SEO titles, meta descriptions, slugs, summaries, outlines, FAQs, headings, calls to action, and social snippets.
- Keep output editable and auditable.
- Track usage and estimated cost per request so real usage can be reviewed after two weeks.
- Show per-session token and cost estimates while the admin uses the assistant.
- Let admins choose from allowed models and see model cost/characteristic summaries before generating.
- Offer internet research as an explicit opt-in that warns about incremental cost and records that spend separately.
- Provide an admin dashboard for AI usage, estimated AI cost, web research usage, and AWS service cost visibility.
- Keep infrastructure modest and reversible.

## Non-Goals

- No autonomous publishing.
- No legal advice engine.
- No automated competitor scraping in Phase 2 Option 1.
- No OpenSearch, vector database, or full RAG system in the first release.
- No generated citations to laws, cases, or authorities unless the user provides the source text in the prompt context.
- No image generation.
- No public-facing chatbot.
- No automatic internet research. Web research is available only when an admin explicitly enables it for a request.

## Primary Users

- Admin attorney: writes and edits site content.
- Admin reviewer: validates generated copy before saving.
- Developer/operator: reviews usage, errors, and costs.

## Cost and Usage Dashboard

Add an admin-only dashboard route:

`/admin/uso`

The dashboard should show three layers of cost visibility.

### AI Usage

Show:

- total AI requests for selected date range
- requests by surface: Blog, Publicaciones, Soluciones, Configuraciones
- requests by action
- requests by model
- total input tokens
- total output tokens
- estimated model cost
- average cost per request
- failed requests and provider errors
- top admins by request count using a safe user identifier

### Web Research Usage

Show separately:

- number of requests with web research enabled
- estimated web search calls
- estimated web search cost
- model tokens used with web research enabled
- total estimated cost for AI + web research
- warning banner when web research usage is a meaningful share of total cost

### AWS Service Cost Visibility

Show:

- current month AWS cost grouped by service when available
- previous month comparison
- services relevant to Moyra: Lambda, API Gateway, DynamoDB, S3, Secrets Manager, CloudWatch, Cognito, ACM/custom domain related line items when AWS exposes them
- last refreshed timestamp
- note that AWS Cost Explorer data can lag and is not a real-time meter

Recommended backend source:

- AI cost: first-party usage records written by `POST /api/v2/ai/assist`.
- AWS service cost: AWS Cost Explorer API, cached server-side to avoid frequent paid requests.

Cost Explorer API requests have their own cost. The dashboard should cache Cost Explorer results for at least 6 hours per environment/date-range query, unless an admin explicitly refreshes. The UI must show that manual refresh may incur an AWS Cost Explorer API request charge.

## Supported Surfaces

### Blog

The assistant should support:

- Article idea expansion from a short topic.
- Blog outline with H2/H3 structure.
- Intro and conclusion drafts.
- FAQ generation.
- SEO title and meta description.
- Suggested slug.
- Tags and keyword ideas.
- LinkedIn/Facebook/WhatsApp sharing copy.
- Readability rewrite in a legal but accessible tone.

### Publicaciones

The assistant should support:

- Clear summary of the publication.
- SEO title, meta description, and slug.
- Suggested headings for long Quill content.
- FAQ and call to action.
- File-aware summary when related file metadata is available.
- Social sharing copy.

### Soluciones

The assistant should support:

- Service page SEO rewrite.
- Short value proposition.
- Clear client problem statement.
- Suggested FAQ.
- Suggested CTA.
- Meta title and description.

### Configuraciones

The assistant should support:

- Public copy polish for home, services, blog, publications, and Nosotros page texts.
- Short/long variants.
- Tone consistency with the legal brand.
- SEO metadata suggestions for public pages when available.

## User Experience

Each supported editor should include a reusable `AiAssistantPanel`.

The panel should be visually consistent with the current Moyra admin style:

- Rectilinear layout.
- No rounded borders.
- Clear input states matching the current admin forms.
- Light elevation/shadow only where it improves hierarchy.
- Compact, work-focused layout.

Panel sections:

1. Context summary
   - Shows what content will be sent to AI.
   - Warns that suggestions must be reviewed by an attorney.

2. Action selector
   - Blog actions: outline, SEO metadata, FAQ, rewrite, social copy.
   - Publication actions: summary, SEO metadata, FAQ, rewrite, social copy.
   - Solution actions: service SEO rewrite, FAQ, CTA, metadata.
   - Configuration actions: page copy polish, short/long variants, metadata.

3. Instruction field
   - Optional user instruction, for example "más formal", "enfocado en empresas", "más claro para clientes".

4. Model selector
   - Shows allowed models.
   - Shows per-1M-token input/output pricing.
   - Shows a short description for each model, for example "balanced quality/cost" or "lower cost for short rewrites".
   - Defaults to the environment-configured recommended model.
   - Does not expose arbitrary model ids typed by the user.

5. Web research toggle
   - Default off.
   - Label should make cost impact explicit: "Investigar en internet (incrementa costo)".
   - When enabled, show a concise warning that external web research may add search-call cost and more tokens.
   - Backend must record web research usage separately.

6. Generate button
   - Disabled while loading.
   - Shows estimated request size when feasible.
   - Shows current session spend estimate before and after generation.

7. Suggestion result
   - Structured sections, not one large blob.
   - Copy buttons per section.
   - Apply buttons for specific fields, such as SEO title, SEO description, slug, tags, intro, outro, FAQ, or body.
   - Applying a suggestion updates local form state only. Existing save behavior remains unchanged.

8. Cost hint
   - Show a simple post-request estimate such as "Uso estimado: 3.2k input / 0.8k output tokens".
   - Show session total for the current editor tab: "Esta sesión: 8.1k tokens, USD 0.03 estimados".
   - If web research was enabled, split the estimate: "Modelo: USD 0.02; investigación web: USD 0.01".
   - Exact provider invoice can differ; this is for practical monitoring.

## Assistant Actions

The first release should implement a focused action set.

### Generate SEO Pack

Input: current title, content, description, tags, page type, URL/slug.

Output:

- `seoTitle`
- `seoDescription`
- `slug`
- `keywords`
- `socialTitle`
- `socialDescription`
- `suggestedInternalLinks`
- `warnings`

### Improve Readability

Input: selected field or current body content.

Output:

- improved copy
- explanation of what changed
- optional shorter variant

### Build Outline

Input: topic/title/current draft.

Output:

- H2/H3 outline
- recommended intro
- recommended conclusion
- suggested FAQ questions

### Generate FAQ

Input: current page content.

Output:

- 3 to 6 FAQ items
- each answer short, plain, and non-definitive
- optional schema-ready structure for a future release

### Social Snippets

Input: current content.

Output:

- LinkedIn copy
- Facebook copy
- WhatsApp short copy
- X/Twitter short copy

### Research With Web

Input: current topic/title/current draft and optional admin instruction.

Output:

- research summary
- practical SEO angles
- source links returned by the provider/search tool
- suggested outline updates
- warnings when source quality is weak

Rules:

- This action is available only when the admin enables web research.
- It must show cost warning before the request.
- It must not generate legal citations as authoritative unless sources are explicitly provided and the output names uncertainty.
- It must record web search calls and web-search estimated cost separately from model token cost.

## Backend Architecture

The serverless API should expose one admin-only endpoint:

`POST /api/v2/ai/assist`

Request:

```json
{
  "surface": "blog | publication | service | configuration",
  "action": "seo-pack | improve-readability | outline | faq | social-snippets | research-with-web",
  "model": "gpt-5.4-mini",
  "webResearch": {
    "enabled": false
  },
  "language": "es-MX",
  "tone": "legal-claro",
  "instruction": "optional user instruction",
  "content": {
    "title": "string",
    "slug": "string",
    "summary": "string",
    "bodyHtml": "string",
    "plainText": "string",
    "seoTitle": "string",
    "seoDescription": "string",
    "tags": ["string"],
    "pageTexts": {}
  }
}
```

Response:

```json
{
  "status": "success",
  "requestId": "string",
  "usage": {
    "provider": "openai",
    "model": "string",
    "inputTokens": 0,
    "outputTokens": 0,
    "webSearchCalls": 0,
    "modelEstimatedUsd": 0,
    "webSearchEstimatedUsd": 0,
    "estimatedUsd": 0
  },
  "result": {
    "sections": [],
    "fields": {},
    "warnings": []
  }
}
```

The backend should:

- Require Cognito admin auth.
- Validate `surface` and `action` against allowlists.
- Validate requested `model` against an environment-configured model allowlist.
- Sanitize incoming HTML to plain text before sending it to the model.
- Truncate very large content to a configured max token/character budget.
- Retrieve the provider API key from Secrets Manager or SSM SecureString.
- Log request metadata, not full content.
- Store usage records in DynamoDB for cost review.
- Return structured JSON only.

Additional admin-only endpoints:

- `GET /api/v2/ai/models`: returns allowed model catalog, prices, descriptions, and default model.
- `GET /api/v2/ai/usage?from=YYYY-MM-DD&to=YYYY-MM-DD`: returns AI usage/cost aggregates from usage records.
- `GET /api/v2/costs/aws?from=YYYY-MM-DD&to=YYYY-MM-DD`: returns cached AWS service cost aggregates from Cost Explorer when enabled.
- `POST /api/v2/costs/aws/refresh`: refreshes AWS cost data manually. This should be admin-only and rate-limited because Cost Explorer API requests are billable.

## Provider Choice

Use OpenAI direct for Phase 2 Option 1.

Reasoning:

- Lowest integration complexity for this repo.
- Good structured output support.
- Easy model switching between cheaper and stronger models.
- Costs are straightforward to estimate.

Provider abstraction should be minimal:

- A backend helper like `generateAiSuggestion(input)`.
- Environment variables for provider and model.
- A small model catalog returned by the backend.
- No multi-provider UI in the first release.

Initial model recommendation:

- Default: `gpt-5.4-mini`.
- Cheap mode for simple tasks: `gpt-5.4-nano`.
- The implementation should make the model configurable by environment variable.

Model catalog fields:

- model id
- display name
- short description
- recommended use
- input price per 1M tokens
- output price per 1M tokens
- whether web research is supported
- enabled/disabled flag

## Current Pricing References

Pricing must be reviewed again before implementation and before production launch.

Current official references checked on 2026-05-21:

- OpenAI `gpt-5.4-mini`: USD 0.75 input / USD 4.50 output per 1M tokens. `gpt-5.4-nano`: USD 0.20 input / USD 1.25 output per 1M tokens. Source: https://developers.openai.com/api/docs/pricing
- OpenAI web search: USD 10.00 per 1k calls. Included in Phase 2 Option 1 only as an explicit admin opt-in. Source: https://developers.openai.com/api/docs/pricing
- AWS Cost Explorer API: USD 0.01 per request using the primary billing view; custom billing views can cost USD 0.01 per source. Source: https://aws.amazon.com/aws-cost-management/aws-cost-explorer/pricing/
- Gemini 2.5 Flash: USD 0.30 input / USD 2.50 output per 1M tokens. Source: https://ai.google.dev/gemini-api/docs/pricing
- AWS Secrets Manager: USD 0.40 per secret per month and USD 0.05 per 10,000 API calls in the pricing example. Source: https://aws.amazon.com/secrets-manager/pricing/
- API Gateway and DynamoDB costs remain marginal for this feature at expected admin-only usage. Sources: https://aws.amazon.com/api-gateway/pricing/ and https://aws.amazon.com/dynamodb/pricing/

## Cost Controls

Phase 2 Option 1 must include:

- Monthly cost review by usage table, not only provider dashboard.
- Per-request max input size.
- Per-request max output tokens.
- Admin-only access.
- No public unauthenticated AI endpoint.
- Web research default off and explicit opt-in per request.
- No automatic retry loops that can multiply token usage.
- Optional environment variable `AI_ASSISTANT_ENABLED=false` kill switch.
- Optional environment variable `AI_MONTHLY_SOFT_LIMIT_USD` for warning-only tracking.
- Optional environment variable `AI_WEB_RESEARCH_ENABLED=false` kill switch.
- Cost Explorer dashboard data cached for at least 6 hours.
- Manual AWS cost refresh rate-limited.

Usage tracking should store:

- timestamp
- stage
- admin user id/email hash or stable Cognito subject
- surface
- action
- model
- input token count
- output token count
- web research enabled
- web search call count
- model estimated cost
- web search estimated cost
- estimated cost
- success/failure
- request id

Do not store full prompt bodies by default.

## Model Selection and Cost Meter

The assistant panel must include a model selector and session cost meter.

Model selector requirements:

- Uses backend model catalog.
- Shows default recommendation.
- Shows model descriptions in plain language.
- Shows input and output cost per 1M tokens.
- Shows whether web research is supported.
- Prevents selecting disabled models.

Session cost meter requirements:

- Starts at zero when the editor page loads.
- Adds each assistant response usage to a session total.
- Separates model token cost from web research cost.
- Shows total tokens and estimated USD for the current page session.
- Resets when the page reloads.
- Does not replace persistent usage records in the backend dashboard.

Dashboard cost meter requirements:

- Aggregates persisted usage across date ranges.
- Shows model and web research spend separately.
- Shows cost by surface and action.
- Offers CSV export in a future release, not required for first implementation.

## Legal and Content Safety

The assistant must be positioned as drafting support, not legal authority.

Required UI copy:

- "La IA genera borradores. Un abogado debe revisar antes de guardar o publicar."

Prompt rules:

- Do not invent laws, case numbers, official citations, prices, guarantees, or deadlines.
- Prefer cautious language.
- If source material is insufficient, return a warning instead of fabricating specifics.
- Keep content in Spanish for Mexico unless the admin explicitly requests another language.
- Avoid making promises of legal outcomes.
- When web research is enabled, summarize sources and include links, but warn if source reliability is unclear.

## Data Handling

Sent to provider:

- Current editor content needed for the selected action.
- Page type and action.
- Optional admin instruction.
- Selected model.
- Web research flag.

Not sent to provider:

- Credentials.
- JWTs.
- Refresh cookies.
- Full user profile.
- Unrelated database content.
- Raw file bytes in Phase 2 Option 1.

File support in this phase:

- Use existing file metadata only: title, type, category, and usage context.
- Do not upload file contents to AI yet.

## Frontend Integration

Add reusable frontend units:

- `AiAssistantPanelComponent`
- `AiAssistantService`
- `AiUsageDashboardComponent`
- model catalog and usage summary types
- Type definitions for request/response/action metadata

Integrate into:

- `ArticleComponent`
- `PublicationComponent`
- `ServicioComponent`
- `ConfiguracionesComponent`
- Admin navigation link for `/admin/uso`

The first implementation should avoid broad refactors. Each editor should pass a small adapter object into the assistant panel and receive structured suggestions back.

## Error Handling

User-visible errors should be practical:

- AI disabled: "El asistente IA no está activo en este ambiente."
- Auth failure: "Tu sesión ya no permite usar IA. Vuelve a iniciar sesión."
- Rate/cost limit: "Se alcanzó el límite temporal del asistente IA."
- Provider failure: "No se pudo generar la sugerencia. Intenta de nuevo."
- Invalid response: "La IA respondió en un formato no válido. Intenta de nuevo."
- Cost data unavailable: "No se pudo cargar el costo de servicios. Intenta actualizar más tarde."
- Web research warning: "La investigación en internet puede aumentar el costo por búsquedas y tokens adicionales."

Backend errors should not leak provider keys, raw prompts, stack traces, or full model responses.

## Testing and Verification

Backend tests:

- Reject unauthenticated request.
- Reject non-admin request.
- Reject invalid surface/action.
- Truncate oversized input.
- Return structured response from a mocked provider.
- Store usage record without full prompt body.
- Estimate cost from mocked usage.
- Estimate separate web research cost from mocked search usage.
- Return model catalog.
- Aggregate AI usage by date range.
- Cache AWS Cost Explorer responses.
- Rate-limit manual AWS cost refresh.
- Handle provider failure safely.

Frontend tests:

- Panel renders actions for each surface.
- Generate button disables while loading.
- Suggestions can be copied/applied to specific fields.
- Model selector renders prices/descriptions and prevents disabled models.
- Session cost meter increments after mocked responses.
- Web research toggle shows cost warning and includes flag in request.
- Usage dashboard renders AI cost, web research cost, and AWS service cost states.
- Errors render clearly.
- Editors keep existing save behavior unchanged.

Browser audit:

- Test `/admin/articulo`.
- Test `/admin/publication`.
- Test `/admin/soluciones`.
- Test `/admin/configuraciones`.
- Test `/admin/uso`.
- Confirm no console errors.
- Confirm suggestions apply only locally until saved.
- Confirm model switch changes visible estimated pricing.
- Confirm web research warning appears before generation.

Release audit:

- Local first.
- Testing deploy.
- Use for a small set of real admin actions.
- Review usage/cost records after two weeks.
- Production only after testing is stable.

## Success Metrics

After two weeks, review:

- Number of AI requests by surface/action.
- Average estimated cost per request.
- Total estimated cost.
- Number of suggestions applied.
- Tokens and estimated cost by model.
- Web research request count and estimated web research cost.
- AWS Cost Explorer refresh count and estimated Cost Explorer API cost.
- Common failures.
- Admin qualitative feedback.
- Whether generated SEO metadata is consistently usable without heavy rewriting.

## Future Option 2 - Site Memory Assistant

Option 2 adds lightweight site memory without OpenSearch.

Potential scope:

- Use DynamoDB/S3 summaries of existing pages, services, articles, publications, and pageTexts.
- Generate internal link suggestions.
- Detect duplicate topics.
- Keep brand tone memory.
- Create content cluster recommendations.
- Summarize uploaded files only when explicitly selected and technically supported.

Architecture:

- Scheduled or on-save summarization jobs.
- Store short page summaries and keyword tags in DynamoDB.
- Assistant endpoint can fetch a limited context pack for the current surface.
- Still no vector database in the first memory version unless real usage justifies it.

Benefits:

- Better cross-linking.
- More consistent tone.
- More useful SEO planning.

Risks:

- Incorrect context if summaries become stale.
- Higher prompt size.
- More complicated permissions and data retention.

Promotion criteria from Option 1:

- Admins use assistant regularly.
- SEO pack/action outputs are valuable.
- Internal linking and duplication become recurring needs.
- Two-week cost data stays within acceptable budget.

## Future Option 3 - Advanced SEO Suite

Option 3 is a broader SEO product layer.

Potential scope:

- Editorial calendar.
- Content briefs.
- Keyword cluster planning.
- Search/web research.
- Competitor comparisons.
- Schema generators.
- Content freshness audit.
- Automated SEO health dashboard.
- Optional search console integration if credentials and compliance are approved.

Benefits:

- Turns Moyra into a full SEO operations tool.
- Supports sustained inbound marketing.
- Helps attorneys plan content strategically.

Risks:

- Higher cost.
- More compliance review.
- More external data providers.
- Greater chance of inaccurate competitor or search-volume claims if data sources are weak.

Promotion criteria from Option 2:

- Clear content production cadence.
- Need for research beyond the current site.
- Approved budget for web search and/or SEO APIs.
- A review process for external claims.

## Implementation Boundaries

The first implementation should be surgical:

- One backend endpoint.
- One provider helper.
- One usage table or compact usage storage pattern.
- One reusable frontend assistant panel.
- Integrations into the four target admin surfaces.

Avoid:

- Custom workflow engines.
- Multi-agent orchestration.
- OpenSearch.
- Public chatbot.
- Automated publishing.
- Large redesigns of editor pages unrelated to the assistant.

## Approval Gate

Implementation should begin only after this design is reviewed and approved.

Once approved, create a detailed implementation plan covering:

- Infra changes in `moyra-infra-serverless`.
- Frontend changes in `moyra-front-angular`.
- Test plan.
- Local audit.
- Testing deployment.
- Two-week cost review process.
