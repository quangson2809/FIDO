package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.repository.AccountRecoveryRepository;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.audit.service.*;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;

@Service
@Transactional
public class AccountSecurityService {
    private final AccountRepository accounts;
    private final AccountRecoveryRepository recovery;
    private final PasswordEncoder passwords;
    private final AccountMailService mail;
    private final AuditWriteService audit;
    private final SecureRandom random = new SecureRandom();

    public AccountSecurityService(
            AccountRepository accounts,
            AccountRecoveryRepository recovery,
            PasswordEncoder passwords,
            AccountMailService mail,
            AuditWriteService audit) {
        this.accounts = accounts;
        this.recovery = recovery;
        this.passwords = passwords;
        this.mail = mail;
        this.audit = audit;
    }

    @PreAuthorize("isAuthenticated()")
    public void changePassword(long actor, String current, String next) {
        Account account = activeLocked(actor);
        if (!passwords.matches(current, account.getPasswordHash()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID");
        change(account, next);
        audit.record(
                AuditWriteEvent.of(
                        AuditAction.ACCOUNT_PASSWORD_CHANGE,
                        AuditEntityType.ACCOUNT,
                        Long.toString(actor)));
    }

    @PreAuthorize("isAuthenticated()")
    public void requestVerification(long actor) {
        mail.requireConfigured();
        Account account = activeLocked(actor);
        if (account.getEmail() == null || account.getEmail().isBlank())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "EMAIL_REQUIRED");
        if (account.getEmailVerifiedAt() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "EMAIL_ALREADY_VERIFIED");
        issue(account, "EMAIL_VERIFY", 86400);
    }

    public void requestReset(String email) {
        mail.requireConfigured();
        var id = recovery.activeVerifiedAccount(email.trim().toLowerCase(java.util.Locale.ROOT));
        if (id.isEmpty()) return;
        Account account = activeLocked(id.get());
        if (account.getEmailVerifiedAt() == null
                || !account.getEmail().equalsIgnoreCase(email.trim())) return;
        issue(account, "PASSWORD_RESET", 900);
    }

    public void verify(String token) {
        var pair = lockedToken(token, "EMAIL_VERIFY");
        Account account = pair.account();
        // A verified email can identify only one active account for recovery.
        var existing = recovery.activeVerifiedAccount(account.getEmail());
        if (existing.isPresent() && existing.get() != account.getAccountId().longValue())
            throw invalid();
        account.setEmailVerifiedAt(LocalDateTime.now(ZoneOffset.UTC));
        try {
            accounts.saveAndFlush(account);
        } catch (org.springframework.dao.DataIntegrityViolationException duplicate) {
            throw invalid();
        }
        recovery.consume(pair.token().hash(), Instant.now());
        recoveryAudit(AuditAction.ACCOUNT_EMAIL_VERIFY, account);
    }

    public void reset(String token, String next) {
        var pair = lockedToken(token, "PASSWORD_RESET");
        if (pair.account().getEmailVerifiedAt() == null) throw invalid();
        change(pair.account(), next);
        recoveryAudit(AuditAction.ACCOUNT_PASSWORD_RESET, pair.account());
    }

    private void recoveryAudit(AuditAction action, Account account) {
        var event =
                AuditWriteEvent.of(
                        action, AuditEntityType.ACCOUNT, account.getAccountId().toString());
        var context =
                org.springframework.security.core.context.SecurityContextHolder.getContext()
                        .getAuthentication();
        if (new org.springframework.security.authentication.AuthenticationTrustResolverImpl()
                .isAuthenticated(context)) audit.record(event);
        else audit.recordSystemEvent(event);
    }

    private void change(Account account, String next) {
        if (next == null
                || next.length() < 8
                || next.length() > 128
                || next.isBlank()
                || next.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        account.setPasswordHash(passwords.encode(next));
        account.revokeAccessTokens();
        accounts.saveAndFlush(account);
        recovery.invalidateAll(account.getAccountId(), Instant.now());
    }

    private void issue(Account account, String purpose, long ttl) {
        Instant now = Instant.now();
        // Same response on throttled/unknown reset requests; cooldown is not an identity oracle.
        if (recovery.recentlyIssued(account.getAccountId(), purpose, now)) return;
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        recovery.issue(
                hash(token),
                account.getAccountId(),
                account.getEmail(),
                purpose,
                now,
                now.plusSeconds(ttl));
        mail.sendLink(account.getEmail(), purpose, token);
    }

    private record Locked(Account account, AccountRecoveryRepository.Recovery token) {}

    private Locked lockedToken(String token, String purpose) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) throw invalid();
        String hash = hash(token);
        var snapshot = recovery.find(hash, false).orElseThrow(AccountSecurityService::invalid);
        Account account = activeLocked(snapshot.accountId());
        var current = recovery.find(hash, true).orElseThrow(AccountSecurityService::invalid);
        if (!purpose.equals(current.purpose())
                || current.consumedAt() != null
                || !Instant.now().isBefore(current.expiresAt())
                || account.getEmail() == null
                || !account.getEmail().equals(current.email())) throw invalid();
        return new Locked(account, current);
    }

    private Account activeLocked(long id) {
        return accounts.findByIdForUpdate(id)
                .filter(Account::isActive)
                .orElseThrow(AccountSecurityService::invalid);
    }

    private static String hash(String token) {
        try {
            return java.util.HexFormat.of()
                    .formatHex(
                            java.security.MessageDigest.getInstance("SHA-256")
                                    .digest(
                                            token.getBytes(
                                                    java.nio.charset.StandardCharsets.US_ASCII)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "RECOVERY_LINK_INVALID");
    }
}
