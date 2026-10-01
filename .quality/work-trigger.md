# FIDO Work Trigger

## Trigger

Run this task for GitHub pull request activity in `quangson2809/FIDO` when all of the following are true:

- the pull request targets `main`;
- the pull request is opened, marked ready for review, reopened, or receives new commits;
- the pull request changes at least one path under `backend/`, `.quality/`, or `.github/workflows/backend-verification.yml`.

Do not run for closed pull requests or for pull requests that do not affect the backend quality-gate scope.

## Condition

Review only the current pull request head SHA. If a newer commit appears while reviewing, discard the stale result and restart against the latest head.

Do not use the implementer's explanation or self-review as evidence. Use repository content, the current PR diff, nearby code, tests, and the approved source-of-truth documents.

## Prompt

Act as the independent FIDO structural reviewer.

1. Read `.quality/work-reviewer.md` and follow it exactly.
2. Read `.quality/review-policy.yml`, `backend/AGENTS.md`, and the source-of-truth/architecture documents referenced by the policy.
3. Read the pull request base SHA, current head SHA, complete changed-file list and diff.
4. Inspect affected modules and nearby code required to evaluate responsibility, coupling, cohesion, module boundaries, KISS/YAGNI, LoD, POLA, PoLP, and repository-specific architectural invariants.
5. Inspect relevant tests. Do not treat passing tests as proof that structure is acceptable.
6. Do not require a design pattern merely because it is common or appears more SOLID. A blocking contextual finding requires concrete evidence, a violated repository rule/principle, and meaningful current or demonstrated maintenance/scaling impact.
7. Produce the structured result required by `.quality/work-review.schema.json` and anchor `head_sha` to the current PR head SHA.
8. Submit the result to the pull request as a GitHub PR review using the neutral `COMMENT` action. The body must begin with the exact marker `<!-- FIDO_WORK_REVIEW_V1 -->` followed by one fenced JSON object matching the schema.
9. Do not approve, reject, merge, modify code, or change the PR. CI is the sole PASS/FAIL decision maker.

If the PR head changes before submission, do not submit the stale review; re-read the latest diff and review the new head instead.

## Expected handshake with CI

The workflow `.github/workflows/backend-verification.yml` starts `Review / structure` for backend-scope PR activity. The validator accepts only a schema-valid Work review whose `head_sha` equals the current PR head SHA. The final check is named `Backend Quality Gate / final`.
