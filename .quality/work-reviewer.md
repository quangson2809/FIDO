# FIDO Work Reviewer Contract

## Purpose

This reviewer is independent from the coding chat. Review the current Pull Request from repository evidence, not from the implementer's explanation.

The reviewer judges whether the **current PR head** preserves a structure that fits FIDO's actual requirements and architecture. It must not force patterns merely because they are popular or appear "more SOLID". The reviewer does **not** decide the final CI status; it supplies a structured judgment that the CI gate validates.

## Mandatory inputs

Read, in this order:

1. `backend/AGENTS.md`.
2. The source-of-truth and architecture documents listed in `.quality/review-policy.yml`.
3. The PR base/head SHA and full diff.
4. The affected modules and nearby code needed to understand responsibilities and dependencies.
5. Existing tests relevant to the changed behavior.

Do not use the implementer's self-review as evidence.

## Review method

Separate findings into:

- **Hard repository/architecture violations**: an explicit invariant or boundary in the source of truth is broken.
- **Contextual design findings**: cohesion, coupling, responsibility, KISS/YAGNI, LoD, POLA, PoLP or scaling pressure is materially worsened.

For a contextual finding, do not block merely because a class is large, has many methods/dependencies, or does not use a preferred pattern. A blocking finding requires all three:

1. concrete evidence in the current code/diff;
2. a violated principle or repository rule;
3. a meaningful current or demonstrated scaling/maintenance impact.

Recommend the smallest coherent correction. Do not require Hexagonal/Clean/DDD ports, CQRS, event buses, microservices, generic base abstractions or interfaces without repository evidence.

## Result rules

Use `BLOCKER` or `MAJOR` only for a finding that must block this PR under the repository evidence and policy. Use `MINOR` or `INFO` for non-blocking observations.

- `result = FAIL` when at least one `BLOCKER` or `MAJOR` finding exists.
- `result = PASS` when no `BLOCKER` or `MAJOR` finding exists.
- `blocking_findings` must contain exactly all `BLOCKER` and `MAJOR` finding IDs.

The review MUST be anchored to the current PR head SHA. If the PR head changes, the old review is stale and must not be reused.

## GitHub review transport

Submit a GitHub Pull Request review using the neutral **COMMENT** action for both PASS and FAIL. CI is the final decider; Work must not approve or reject the PR itself.

- Anchor the review to the current head commit using `commit_id` when available.
- The review body must start with this exact marker:

`<!-- FIDO_WORK_REVIEW_V1 -->`

Then include one fenced JSON object matching `.quality/work-review.schema.json`.

Example:

````text
<!-- FIDO_WORK_REVIEW_V1 -->
```json
{
  "version": "1",
  "head_sha": "0123456789abcdef0123456789abcdef01234567",
  "result": "FAIL",
  "summary": "Order lifecycle change introduces a blocking module-boundary violation.",
  "blocking_findings": ["ARCH-001"],
  "findings": [
    {
      "id": "ARCH-001",
      "severity": "MAJOR",
      "principles": ["SeparationOfConcerns", "LowCoupling"],
      "evidence": [
        "Order service imports an inventory repository directly."
      ],
      "impact": "Order bypasses the inventory module contract and couples lifecycle behavior to inventory persistence.",
      "recommendation": "Route the stock-changing operation through the inventory service/contract already owned by inventory.",
      "files": ["backend/src/main/java/com/fido/modules/order/service/Example.java"]
    }
  ]
}
```
````

Do not output scores such as `8/10` or architecture percentages. Return evidence and a gate result.
