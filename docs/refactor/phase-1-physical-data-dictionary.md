# Phase 1 — Physical Data Dictionary

The physical data dictionary is maintained in one canonical artifact to prevent competing schema descriptions.

- **Canonical logical model:** [ERD v2](phase-1-erd-v2-approved.mmd)
- **Canonical physical dictionary:** [P1-data-dictionary.csv](../refactor-v2/p1/P1-data-dictionary.csv)
- **Target DDL:** `backend/src/main/resources/db/clean-reset/V1__clean_schema.sql`
- **Required system seed:** `backend/src/main/resources/db/clean-reset/V2__system_seed.sql`
- **Owner-approved behavior:** [P1 owner approval](../refactor-v2/p1/P1-owner-approval-2026-10-23.md)

Do not maintain a second hand-written column inventory here. Column names, SQL types, nullability, defaults, generated columns, constraints, indexes and delete actions must be changed in the canonical dictionary and target DDL together, then validated by the schema checker and a fresh MySQL install.

The 31-table target and owner-approved business defaults are recorded. Runtime JPA/API/frontend mapping and behavioral acceptance are separate gates; this pointer is not a claim that the live application has been migrated. Numeric retention durations and anonymization exceptions remain TBD.
