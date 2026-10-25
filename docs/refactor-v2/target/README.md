# ERD v2 Target Artifacts

This directory is the canonical home for the approved ERD, its human-readable summary, the dictionary pointer and the isolated clean-reset operator runbook. The machine-readable physical Data Dictionary remains at `../p1/P1-data-dictionary.csv` because it is also a P1 acceptance artifact consumed by the consistency checker. Link to that CSV; do not create a second copy.

| Artifact | Authority / use |
|---|---|
| [`erd-v2-approved.mmd`](erd-v2-approved.mmd) | Canonical owner-approved logical ERD v2; exactly 31 target tables. |
| [`erd-v2-contract.md`](erd-v2-contract.md) | Human-readable invariant summary; exact relationships remain in the ERD and physical fields in the dictionary. |
| [`physical-data-dictionary.md`](physical-data-dictionary.md) | Pointer and validation rules for the canonical CSV. It is not a second column inventory. |
| [`P1 Data Dictionary CSV`](../p1/P1-data-dictionary.csv) | Canonical physical field contract, including SQL types, nullability, constraints, keys and evidence. |
| [`Clean Schema Reset runbook`](clean-schema-reset-runbook.md) | Safe operator procedure for creating/testing target schema in a verified disposable database only. |
| [`P1 owner approval`](../p1/P1-owner-approval-2026-10-23.md) and [`decision log`](../p1/P1-decision-log.md) | Approved target choices and dated amendments. |

## Change protocol

Any approved target change must update the logical ERD, physical dictionary, isolated target DDL, seed specification if affected, domain API/DTO/business/transaction contract and relevant tests/traceability in one coordinated phase. Then run the contract-consistency checker and the fresh isolated MySQL verification on the exact candidate SHA.

Do not update the active Flyway chain or reset a database merely by editing these design artifacts. Existing-data rollout requires its own approved migration/preflight.
