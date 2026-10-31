# Phase 1 — Physical Data Dictionary

The physical data dictionary is maintained in one canonical artifact to prevent competing schema descriptions.

- **Canonical logical model:** [ERD v2](erd-v2-approved.mmd)
- **Canonical physical dictionary:** [P1-data-dictionary.csv](../p1/P1-data-dictionary.csv)
- **唯一 DDL + system seed installer:** `backend/src/main/resources/db/migration/V1__fido_target_schema.sql`
- **Owner-approved behavior:** [P1 owner approval](../p1/P1-owner-approval-2026-10-23.md)

Do not maintain a second hand-written column inventory here. Column names, SQL types, nullability, defaults, generated columns, constraints, indexes and delete actions must be changed in the canonical dictionary and target DDL together, then validated by the schema checker and a fresh MySQL install. Do not create per-phase SQL migration files; future phases change code against this baseline and the feature contracts.

The revised 30-table target and owner-approved business defaults are recorded. Runtime JPA/API/frontend mapping and behavioral acceptance are separate gates; this pointer is not a claim that the live application has been migrated. Numeric retention durations and anonymization exceptions remain TBD.
