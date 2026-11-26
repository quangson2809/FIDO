package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Otp;
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
    private final EmailService mail;
    private final OtpStorageService storage;
    private final AuditWriteService audit;
    private final SecureRandom random = new SecureRandom();

    public AccountSecurityService(
            AccountRepository accounts,
            AccountRecoveryRepository recovery,
            PasswordEncoder passwords,
            EmailService mail,
            OtpStorageService storage,
            AuditWriteService audit) {
        this.accounts = accounts;
        this.recovery = recovery;
        this.passwords = passwords;
        this.mail = mail;
        this.storage = storage;
        this.audit = audit;
    }

    public void verification(String email) {
       Account account = accounts.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        if (email == null || email.isBlank())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "EMAIL_REQUIRED");

        mail.sendOtp(email);
        audit.record(
                AuditWriteEvent.of(
                        AuditAction.ACCOUNT_EMAIL_VERIFY,
                        AuditEntityType.ACCOUNT,
                        Long.toString(account.getAccountId())));
    }


    public void verify(String email, String otp) {
        Otp otpDetail  = storage.getOtp(email);

        if (otpDetail == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_MISSING");

        if(otpDetail.getExpirationTime().isBefore(LocalDateTime.now())){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED");
        }

        if(!otpDetail.getOtp().equals(otp)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "OTP_INVALID");
        }

        storage.removeOtp(email);

        Account account = accounts.findByEmail(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ACCOUNT_NOT_FOUND"));
        audit.record(
            AuditWriteEvent.of(
                AuditAction.ACCOUNT_EMAIL_VERIFY,
                AuditEntityType.ACCOUNT,
                Long.toString(account.getAccountId())));
    }

    public void changePassword(String email,String password,String confirmPassword) {
        if(!password.equals(confirmPassword)){
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "PASSWORDS_DO_NOT_MATCH");
        }

        Account account = accounts.findByEmail(email.trim().toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ACCOUNT_NOT_FOUND"));

        account.setPasswordHash(passwords.encode(password));
        accounts.save(account);
        audit.record(
                AuditWriteEvent.of(
                        AuditAction.ACCOUNT_PASSWORD_RESET,
                        AuditEntityType.ACCOUNT,
                        Long.toString(account.getAccountId())));
    }

}
