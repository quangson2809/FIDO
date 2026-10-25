# Documentation Archive

**Purpose:** preserve historical implementation evidence without confusing it with the current ERD v2 target or runtime acceptance status. Archive placement is a classification, not deletion.

## Archive map

| Directory | What belongs here |
|---|---|
| [`phase-history/`](phase-history/16-phase-7-gate-2026-09-28.md) | Historical phase gates whose PASS applies only to their original date, branch and SHA. |
| [`implementation-history/`](implementation-history/23-phase-14-verification-architecture-review.md) | Prior implementation hardening and image test/verification reports, plus attached evidence JSON. These do not certify the current ERD v2 runtime. |
| [`reviews/`](reviews/documentation-cleanup-2026-10-22.md) | Dated audit, Cart/Checkout and documentation cleanup reports. Treat statuses/open decisions as historical unless the current source-of-truth explicitly carries them forward. |
| [`reviews/architecture/`](reviews/architecture/design-pattern-overlap-audit-demo1.md) | Design-pattern assessments tied to their recorded code baselines; not instructions to add patterns to current code. |
| [`phase-1-owner-decision-questionnaire.md`](refactor-v2/phase-1-owner-decision-questionnaire.md) | Superseded owner questionnaire retained for provenance. The approved owner record, amendment and decision log take precedence. |
| [`legacy-plans/`](legacy-plans/11-implementation-phases-pre-erd-v2.md) | Pre-ERD-v2 implementation roadmap, kept only to explain the historical plan. |

## Rules for archived artifacts

- Preserve original dates, branch/commit SHAs, test results, limitations and evidence boundaries.
- Do not rewrite a historical PASS/PARTIAL/FAIL to make it appear to describe current code.
- Keep links to current normative documents where practical, but clearly label historical paths/baselines.
- Do not copy old schema, ProductVariant, API, money, or Cart/Checkout semantics into the target contract.
- Before removing any archived artifact permanently, verify that no acceptance trace, audit, test attachment or user requirement depends on it.

Current source-of-truth: [`docs/README.md`](../README.md), [`docs/00-source-of-truth.md`](../00-source-of-truth.md), and the [ERD v2 program index](../refactor-v2/README.md).
