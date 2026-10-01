# 14 — Definition of Done

A backend task/phase is DONE only when all applicable items pass.

## Scope

- [ ] Change maps to explicit FR/BRULE/DB C/API number or an approved technical task.
- [ ] No TBD/Phase-later behavior was silently implemented.
- [ ] No unapproved endpoint/table/business column/state or employee permission grant added; technical capability identifiers encode approved behavior and are recorded in docs/15.

## Architecture

- [ ] Business code remains under `com.fido.modules.<module>`.
- [ ] Controller contains no business logic.
- [ ] Service owns orchestration/transactions.
- [ ] Repository contains persistence and queries, without business state transitions.
- [ ] No Entity returned directly to API.
- [ ] No direct cross-module repository access.
- [ ] No gratuitous abstraction/dependency/version change.
- [ ] Responsibilities, coupling and cohesion reviewed with concrete evidence; no mechanical requirement to split every read/write service.
- [ ] Shared rules have one owner, module dependencies use owned contracts, and query paths have no persistence side effects.

## Data

- [ ] DB constraints match documented invariants.
- [ ] Historical snapshots are not rewritten.
- [ ] No hard delete of protected history.
- [ ] Derived fields are not duplicated as new source-of-truth columns.

## Transactions

- [ ] Side effects are atomic.
- [ ] Retry cannot duplicate stock/payment/receipt effects.
- [ ] Stock cannot become negative.
- [ ] Every stock mutation creates one correct ledger movement.
- [ ] Audit is written where required.

## API/Security

- [ ] URL/method/request/response match baseline.
- [ ] JSON snake_case and wrapper/pagination match contract.
- [ ] Public/JWT boundary correct.
- [ ] Ownership/permission checks server-side.
- [ ] No password/token/secret/PII leak.

## Verification

- [ ] Compile/build passes.
- [ ] Unit tests pass.
- [ ] Relevant integration/API tests pass.
- [ ] Relevant concurrency/idempotency tests pass.
- [ ] Diff reviewed for accidental changes and applicable KISS, YAGNI, Boy Scout Rule, SoC, Low Coupling, High Cohesion, LoD, Curly's Law, POLA and PoLP consequences.
- [ ] Findings identify code location, scenario/impact and minimal remediation; a named principle or class count alone is not evidence.
- [ ] Backend PRs have separate H2/MySQL test results and independent Work review for the current head.
- [ ] Remaining blockers/TBD explicitly reported.
