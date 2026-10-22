# Phase 1 — Preflight SQL and Synthetic Fixture Runbook

## Purpose and safety boundary

This package prepares the data-evidence phase for the owner-confirmed 31-table target ERD. It has not migrated the application or changed the live database.

Files:
- docs/refactor/phase-1-physical-data-dictionary.md — target columns and unresolved physical decisions.
- backend/src/test/resources/refactor/phase-1-source-preflight.sql — SELECT-only diagnostics for the existing V1–V6 schema.
- backend/src/test/resources/refactor/phase-1-source-fixture.sql — synthetic INSERT-only fixture for an isolated schema already migrated through V1–V6.

Never run the fixture against production, staging with real data, or a shared developer database. The preflight should run against an authorized, sanitized copy with read-only credentials. Neither SQL file contains DROP, DELETE, TRUNCATE, ALTER or CREATE statements.

## Step A — prepare isolation

1. Create a new disposable MySQL 8.4 database using a test-only database administrator account.
2. Apply existing immutable Flyway V1–V6 migrations to that disposable database only.
3. Confirm the preflight's section A reports all 32 source tables as PRESENT. If not, stop and resolve the source version first.
4. Keep production credentials and data out of the fixture and output artifacts.

Do not reuse the current app database, an existing shared schema, or a shared developer database for any destructive experiment.

## Step B — load fixture and inspect preflight

1. Load phase-1-source-fixture.sql into the disposable source schema after V1–V6. It uses IDs starting at 9001 and synthetic example.invalid addresses.
2. Run phase-1-source-preflight.sql against that same schema.
3. Expected synthetic signals:
   - 2 accounts, 2 legacy Product rows, 2 Variants, 2 Orders, 2 OrderItems, 2 Payments and 2 Quotes are inserted;
   - one Variant has no Inventory row by design (a post-V6 drift case; V3 is not rerun);
   - one Product has populated image alt text and one OrderItem has a non-null image_url_snapshot;
   - one order has a voucher targeting link and usage row;
   - one payment carries aggregate refunded amount and refund actor/time;
   - supplier address/note, receipt date/note and audit description are populated;
   - one Cart is unowned (guest-style source data); one quote is future-dated and one is expired;
   - product IDs and Variant IDs intentionally overlap numerically in independent legacy identity spaces, demonstrating why equality is not a valid crosswalk.
4. Save the outputs as a synthetic fixture report and label it synthetic, not as real-source evidence.

## Step C — profile real source data

Only after authorization, run the same SELECT-only preflight on a sanitized copy of the current source DB. Capture exact table row counts, account phone null/blank/duplicate results, Variant-to-Inventory coverage, ID overlap counts, legacy snapshot and source-only field counts, voucher scope/usage/quote results, and referential-check outputs.

The query outputs are measurements, not automatic go/no-go decisions. Raw stock ledger delta sums do not prove inventory balance because the source may have an unknown opening balance.

## Step D — decisions before target migration

Do not implement/execute target DDL until:
1. target physical types/lengths, decimal scales, nullability, defaults, status values, checks, indexes and FK actions are reviewed;
2. phone login/uniqueness is compatible with the ERD's unmarked phone uniqueness;
3. every populated source-only field has a transform/archive/retire disposition;
4. image snapshots, payment/refund aggregates, voucher scope/usage, quote state and audit descriptions have an approved retention/mapping plan;
5. source available_quantity has been reconciled to the meaning of target quantity_on_hand;
6. the Variant-to-child-Product crosswalk allocates target IDs without numeric-ID reuse and maps all dependent rows exactly once.

## Verification status

- SQL fixture is authored, but has **not** been executed.
- Source preflight has **not** been run against a live or sanitized database.
- No target migration has been authored or run in this step.
- P1 remains PARTIAL until physical decisions are reviewed and migration tests run on clean and representative populated fixtures.
