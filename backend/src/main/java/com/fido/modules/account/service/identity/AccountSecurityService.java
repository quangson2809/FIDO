package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Otp;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;

@Service
public class AccountSecurityService {
    private final AccountRepository accounts;
    private final AuthenticationService authentication;
    private final EmailService mail;
    private final OtpStorageService storage;
    private final AuditWriteService audit;
    private final SecureRandom random = new SecureRandom();

    public AccountSecurityService(
            AccountRepository accounts,
            AuthenticationService authentication,
            EmailService mail,
            OtpStorageService storage,
            AuditWriteService audit) {
        this.accounts = accounts;
        this.authentication = authentication;
        this.mail = mail;
        this.storage = storage;
        this.audit = audit;
    }

    public void sendOtp(String email) {
        String normalized = normalizeEmail(email);
        Account account = requireEmailAccount(normalized);
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        // Chỉ thay mã đang lưu khi gửi email thành công.
        mail.sendOtp(normalized, code);
        storage.storeOtp(
                new Otp(account.getAccountId(), normalized, code, Instant.now().plusSeconds(120)));
    }

    public void verifyOtp(String email, String code) {
        String normalized = normalizeEmail(email);
        Account account = requireEmailAccount(normalized);
        requireOtp(account, normalized, code);
    }

    @Transactional
    public void resetPassword(
            String email,
            String code,
            String password,
            String confirmPassword,
            boolean authenticated) {
        Account account = requireEmailAccount(normalizeEmail(email));
        replacePassword(account, code, password, confirmPassword, authenticated);
    }

    @Transactional
    public void changePassword(long actor, String code, String password, String confirmPassword) {
        Account account = requireActiveAccount(actor);
        replacePassword(account, code, password, confirmPassword, true);
    }

    private void replacePassword(
            Account account,
            String code,
            String password,
            String confirmPassword,
            boolean authenticated) {
        if (password == null || !password.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORDS_DO_NOT_MATCH");
        }
        String hash = authentication.hashPassword(password);
        String email = normalizeEmail(account.getEmail());
        Otp otp = requireOtp(account, email, code);
        // So sánh và xóa cùng lúc để một mã không đổi mật khẩu thành công hai lần.
        if (!storage.removeOtp(email, otp)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_INVALID");
        }

        account.setPasswordHash(hash);
        account.revokeAccessTokens();
        accounts.save(account);
        var event =
                AuditWriteEvent.of(
                        AuditAction.ACCOUNT_PASSWORD_RESET,
                        AuditEntityType.ACCOUNT,
                        Long.toString(account.getAccountId()));
        if (authenticated) {
            audit.record(event);
        } else {
            audit.recordSystemEvent(event);
        }
    }

    private Otp requireOtp(Account account, String email, String code) {
        Otp otp = storage.getOtp(email);
        if (otp == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_MISSING");
        }
        if (otp.isExpired(Instant.now())) {
            storage.removeOtp(email, otp);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED");
        }
        if (otp.getAccountId() != account.getAccountId() || !otp.getCode().equals(code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_INVALID");
        }
        return otp;
    }

    private Account requireEmailAccount(String email) {
        var matches = accounts.findByEmailAndStatusAndDeletedAtIsNull(email, "ACTIVE");
        if (matches.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "RECOVERY_ACCOUNT_NOT_FOUND");
        }
        if (matches.size() != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "RECOVERY_EMAIL_AMBIGUOUS");
        }
        return matches.get(0);
    }

    private Account requireActiveAccount(long id) {
        return accounts.findById(id)
                .filter(Account::isActive)
                .orElseThrow(
                        () ->
                                new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST, "RECOVERY_ACCOUNT_NOT_FOUND"));
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMAIL_REQUIRED");
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
