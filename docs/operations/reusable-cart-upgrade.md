# Reusable Cart upgrade — 2026-11-18

The owner-approved model has at most one persisted Cart per Account, enforced by
`uq_carts_account`. Cart has no status and survives successful order placement.
Only purchased working lines are deleted; Order snapshots retain purchase history.

## Fresh disposable database

The canonical V1 baseline installs the new shape. Existing reset restrictions in
`docs/00-source-of-truth.md` still apply: never reset shared or persistent data.

## Existing database with the previous Cart shape

1. Back up and verify the restore path. Stop application writes throughout this
   upgrade and deploy the matching backend before reopening traffic.
2. Inspect the schema and duplicate-cart report in
   `ops/sql/2026-11-18-reusable-cart.sql`. Check Cart foreign keys against the
   canonical schema; do not apply this script to an unknown legacy layout.
3. Run the script using a MySQL client that stops on its first error (no `--force`).
   It stops before changing data if any Account has more than one nonempty Cart.
   Resolve those cases explicitly; the script never chooses or merges their lines.
4. For each remaining Account, keep its sole nonempty Cart, or the lowest Cart ID
   when all its Carts are empty. Delete only redundant empty Cart rows. Existing
   CartItems, their IDs/quantities and the retained Cart timestamps are preserved.
   Then remove the old status/check/index and add the Account unique constraint.
5. Verify no duplicate `account_id`, no `carts.status`, presence of
   `uq_carts_account`, and unchanged CartItem counts/quantities. Verify Orders and
   OrderItems against the backup. Exercise an empty read, add and checkout, then
   add again and confirm the same Cart ID is reused.
6. Under this repository's single pre-release V1 policy, an existing Flyway history
   has the previous checksum. Review the complete schema difference first. Only
   after the schema matches the new canonical baseline may an operator run the
   controlled Flyway repair and validate it. This script does not repair history,
   reset a database, or perform unrelated schema upgrades.

The empty-row cleanup is transactional. MySQL DDL commits implicitly: cleanup and
the final atomic ALTER are separate commits. If ALTER fails, keep traffic stopped,
inspect the cause and retained data, then retry or restore from the verified backup.
An already upgraded schema is rejected by the legacy-shape guard; do not rerun
blindly. No application-startup data repair is introduced.

## Focused verification

`ReusableCartMigrationTests` runs this exact SQL against disposable local MySQL
databases. It verifies preservation of nonempty Carts, empty-only deduplication,
the new schema/unique constraint, and rejection of ambiguous nonempty Carts before
data mutation. Cart/checkout API tests cover ownership, read-without-write,
rollback, replay and concurrent add/update/checkout.
