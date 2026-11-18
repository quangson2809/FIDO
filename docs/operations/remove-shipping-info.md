# Remove ShippingInfo — 2026-11-18

The owner authorizes removing shipping_infos and its carrier, tracking, status and
dispatch/delivery fields completely. No replacement columns or tables are created.
Order status represents the workflow; in the current COD-only contract,
payments.collected_at is the original completion time for order responses, the
two-day return window and sales/product reports. Refunds retain that original time.

## Fresh installation

The single canonical V1 baseline installs 29 tables. Reset is permitted only for a
verified disposable development/test database under docs/00-source-of-truth.md.

## Existing installation

1. Take and verify a backup. Stop application writes for the entire upgrade.
2. Review the schema against the canonical baseline and inspect this query:

   ```sql
   SELECT o.id, o.status, s.shipping_status, s.delivered_at,
          p.payment_status, p.collected_at
   FROM orders o
   LEFT JOIN shipping_infos s ON s.order_id = o.id
   LEFT JOIN payments p ON p.order_id = o.id
   ORDER BY o.id;
   ```

3. Run ops/sql/2026-11-18-remove-shipping-info.sql using a client that stops on its
   first error, without --force. It requires matching Order/Payment/Shipping states
   and identical delivered_at/collected_at for completed/returned Orders. Missing
   or conflicting data aborts before DROP; resolve from verified business evidence.
   Do not guess timestamps, overwrite historical payment facts, or use updated_at.
4. The script permanently drops shipping_infos, including carrier/tracking/dispatch
   metadata. Its backup is the recovery source. MySQL DROP TABLE commits implicitly;
   this is a maintenance operation, not a transactionally reversible app command.
5. Verify unchanged Orders, OrderItems, addresses and Payment facts/counts, and
   compare sales/product report periods against the backup. Confirm no extra
   columns appeared on orders and the table is absent. Deploy the matching backend
   and frontend together: shipping_info is removed, recipient.name comes from the
   saved address, completed_at comes from Payment collection time.
6. Under the repository's single pre-release V1 policy, review all schema drift
   before an operator-controlled Flyway repair/validate of the old V1 checksum.
   The script does not reset a database, automatically repair Flyway history or
   perform unrelated upgrades. Reopen traffic only after validation succeeds.

No shared or live database is changed by implementing or testing this refactor.
RemoveShippingInfoMigrationTests exercises this exact script on disposable local
MySQL, checking preservation of remaining data and rejection of mismatched dates
or states before dropping the table.
