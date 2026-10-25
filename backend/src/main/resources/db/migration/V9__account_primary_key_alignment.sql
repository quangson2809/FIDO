-- Align the runtime Account primary-key column with the approved target schema.
-- MySQL and H2 update referencing FK metadata when a referenced column is renamed.
-- Child-side account_id columns intentionally retain their domain-specific names.
ALTER TABLE accounts RENAME COLUMN account_id TO id;
