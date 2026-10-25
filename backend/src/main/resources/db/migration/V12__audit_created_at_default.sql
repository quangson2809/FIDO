-- Target audit writer leaves event time to the database; provide the target default for legacy schema history.
ALTER TABLE audit_logs MODIFY COLUMN created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
