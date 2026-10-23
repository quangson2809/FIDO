# P1 Data Dictionary — coverage and status

**Status: PARTIAL.** Static consistency and the disposable MySQL 8.4 schema test are necessary checks, not sufficient evidence of cross-layer target acceptance. Their current result must be read from the workflow run whose head SHA matches the PR HEAD. Owner/business and entity/API/DTO/frontend blockers remain separate.

The canonical source is P1-data-dictionary.csv (RFC 4180 CSV). Use a real CSV parser rather than splitting lines on commas.

- Logical schema at the inspected baseline: 31 tables / 228 ERD fields after adding goods_receipts.warehouse_id (snapshot count, not a hardcoded future acceptance target).
- Physical draft at the inspected baseline: 31 tables / 229 SQL columns, including generated physical-only accounts.phone_active_key for active-account-only uniqueness. The checker compares against the parsed canonical ERD rather than hard-coding 31.
- Every physical field has one row with SQL type, observed physical nullability/default, generated expression, constraint/index references, target ownership and current implementation status/evidence.
- LEGACY_ENTITY_REQUIRES_REMAP and TARGET_ENTITY_NOT_IMPLEMENTED explicitly do not mean the current application matches the target schema.

Run from the repository root:

    python scripts/p1/check_contract_consistency.py

A successful static check does not prove MySQL execution, Java mapping, API/DTO/frontend compatibility, authorization, concurrency or business behavior; these remain separate exit-gate conditions.
