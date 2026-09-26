# 14 — Definition of Done

A backend task/phase is DONE only when all applicable items pass.

## Scope

- [ ] Change maps to explicit FR/BRULE/DB C/API number or an approved technical task.
- [ ] No TBD/Phase-later behavior was silently implemented.
- [ ] No unapproved endpoint/table/column/state/permission code added.

## Architecture

- [ ] Business code remains under `com.fido.modules.<module>`.
- [ ] Controller contains no business logic.
- [ ] Service owns orchestration/transactions.
- [ ] Repository contains persistence only.
- [ ] No Entity returned directly to API.
- [ ] No direct cross-module repository access.
- [ ] No gratuitous abstraction/dependency/version change.

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
- [ ] Diff reviewed for accidental changes.
- [ ] Remaining blockers/TBD explicitly reported.
