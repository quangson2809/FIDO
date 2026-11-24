package com.fido.modules.account.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;

@Repository
public class AccountRecoveryRepository {
    private final JdbcTemplate jdbc;

    public AccountRecoveryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Recovery(
            String hash,
            long accountId,
            String email,
            String purpose,
            Instant expiresAt,
            Instant consumedAt) {}

    public Optional<Recovery> find(String hash, boolean lock) {
        return jdbc
                .query(
                        "SELECT * FROM account_recovery_tokens WHERE token_hash=?"
                                + (lock ? " FOR UPDATE" : ""),
                        (r, n) ->
                                new Recovery(
                                        r.getString("token_hash"),
                                        r.getLong("account_id"),
                                        r.getString("email_snapshot"),
                                        r.getString("purpose"),
                                        r.getTimestamp("expires_at").toInstant(),
                                        r.getTimestamp("consumed_at") == null
                                                ? null
                                                : r.getTimestamp("consumed_at").toInstant()),
                        hash)
                .stream()
                .findFirst();
    }

    public boolean recentlyIssued(long accountId, String purpose, Instant now) {
        return jdbc.queryForObject(
                        "SELECT COUNT(*) FROM account_recovery_tokens WHERE account_id=? AND purpose=? AND created_at>?",
                        Long.class,
                        accountId,
                        purpose,
                        Timestamp.from(now.minusSeconds(60)))
                > 0;
    }

    public void issue(
            String hash,
            long accountId,
            String email,
            String purpose,
            Instant now,
            Instant expires) {
        jdbc.update(
                "UPDATE account_recovery_tokens SET consumed_at=? WHERE account_id=? AND purpose=? AND consumed_at IS NULL",
                Timestamp.from(now),
                accountId,
                purpose);
        jdbc.update(
                "INSERT INTO account_recovery_tokens(token_hash,account_id,email_snapshot,purpose,created_at,expires_at) VALUES (?,?,?,?,?,?)",
                hash,
                accountId,
                email,
                purpose,
                Timestamp.from(now),
                Timestamp.from(expires));
    }

    public void consume(String hash, Instant now) {
        jdbc.update(
                "UPDATE account_recovery_tokens SET consumed_at=? WHERE token_hash=?",
                Timestamp.from(now),
                hash);
    }

    public void invalidateAll(long accountId, Instant now) {
        jdbc.update(
                "UPDATE account_recovery_tokens SET consumed_at=? WHERE account_id=? AND consumed_at IS NULL",
                Timestamp.from(now),
                accountId);
    }

    public Optional<Long> activeVerifiedAccount(String email) {
        return jdbc
                .query(
                        "SELECT id FROM accounts WHERE verified_email_key=? AND status='ACTIVE'",
                        (r, n) -> r.getLong(1),
                        email)
                .stream()
                .findFirst();
    }
}
