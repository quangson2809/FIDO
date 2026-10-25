-- Add the target Audit Log contract without discarding legacy descriptions/history.
ALTER TABLE audit_logs RENAME COLUMN audit_id TO id;
ALTER TABLE audit_logs MODIFY COLUMN actor_account_id BIGINT NULL;
ALTER TABLE audit_logs MODIFY COLUMN target_type VARCHAR(80) NULL;
ALTER TABLE audit_logs MODIFY COLUMN target_id VARCHAR(80) NULL;
ALTER TABLE audit_logs ADD COLUMN entity_type VARCHAR(80) NULL;
ALTER TABLE audit_logs ADD COLUMN entity_id VARCHAR(100) NULL;
ALTER TABLE audit_logs ADD COLUMN before_data JSON NULL;
ALTER TABLE audit_logs ADD COLUMN after_data JSON NULL;
ALTER TABLE audit_logs ADD COLUMN correlation_id VARCHAR(120) NULL;
UPDATE audit_logs SET entity_type=target_type, entity_id=target_id WHERE entity_type IS NULL;
CREATE INDEX ix_audit_logs_entity_time ON audit_logs (entity_type, entity_id, created_at);
