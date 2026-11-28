package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fido.modules.account.entity.Otp;
import com.fido.modules.account.service.identity.EmailService;
import com.fido.modules.account.service.identity.OtpStorageService;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

class PasswordOtpHttpTests extends AccountHttpSupport {
    @MockitoBean EmailService mail;
    @Autowired OtpStorageService storage;

    record Identity(long id, String phone, String email, String token) {}

    @AfterEach
    void removeRecoveryAudit() {
        for (long id : created) {
            db.update(
                    "DELETE FROM audit_logs WHERE entity_type='ACCOUNT' AND entity_id=?",
                    Long.toString(id));
        }
    }

    @Test
    void publicOtpResetsPasswordOnceAndRevokesExistingJwt() throws Exception {
        var owner = identity();
        String code = issue(owner);
        assertTrue(code.matches("[0-9]{6}"));
        long ttl =
                Duration.between(Instant.now(), storage.getOtp(owner.email()).getExpiresAt())
                        .getSeconds();
        assertTrue(ttl >= 115 && ttl <= 120);
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/auth/email/verify-otp",
                                null,
                                Map.of("email", owner.email(), "otp", code))
                        .status());
        assertEquals(400, reset(owner, wrong(code), "Changed-password-123").status());
        assertEquals(200, call("GET", "/api/v1/me", owner.token(), null).status());
        assertEquals(204, reset(owner, code, "Changed-password-123").status());
        assertNull(storage.getOtp(owner.email()));
        assertEquals(401, call("GET", "/api/v1/me", owner.token(), null).status());
        assertEquals(400, reset(owner, code, "Second-password-123").status());
        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("phone", owner.phone(), "password", PASSWORD))
                        .status());
        assertEquals(
                200,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("phone", owner.phone(), "password", "Changed-password-123"))
                        .status());
    }

    @Test
    void sendOtpRequiresJsonBodyInsteadOfQueryFallback() throws Exception {
        var owner = identity();
        assertEquals(
                400,
                call("POST", "/api/v1/email/send-otp?email=" + owner.email(), null, null).status());
        verifyNoInteractions(mail);
        assertTrue(issue(owner).matches("[0-9]{6}"));
    }

    @Test
    void publicRecoveryAlsoWorksWhenCallerHasAValidJwt() throws Exception {
        var owner = identity();
        var caller = identity();
        String code = issue(owner);
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/auth/password-reset/confirm",
                                caller.token(),
                                Map.of(
                                        "email",
                                        owner.email(),
                                        "otp",
                                        code,
                                        "password",
                                        "Changed-password-123",
                                        "confirm_password",
                                        "Changed-password-123"))
                        .status());
        assertEquals(200, call("GET", "/api/v1/me", caller.token(), null).status());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM audit_logs WHERE action='ACCOUNT_PASSWORD_RESET' AND entity_id=? AND actor_account_id=?",
                        Integer.class,
                        Long.toString(owner.id()),
                        caller.id()));
    }

    @Test
    void profileChangeUsesJwtOwnerAndStillRequiresThatOwnersOtp() throws Exception {
        var owner = identity();
        var other = identity();
        String otherCode = issue(other);
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/me/password",
                                owner.token(),
                                passwordBody(otherCode, "Changed-password-123"))
                        .status());
        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/me/password",
                                null,
                                passwordBody(otherCode, "Changed-password-123"))
                        .status());
        String code = issue(owner);
        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/me/password",
                                owner.token(),
                                Map.of(
                                        "password",
                                        "Changed-password-123",
                                        "confirm_password",
                                        "Changed-password-123"))
                        .status());
        assertEquals(
                204,
                call(
                                "POST",
                                "/api/v1/me/password",
                                owner.token(),
                                passwordBody(code, "Changed-password-123"))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", owner.token(), null).status());
        assertEquals(200, call("GET", "/api/v1/me", other.token(), null).status());
        assertEquals(204, reset(other, otherCode, "Other-password-123").status());
    }

    @Test
    void resendReplacesCodeAndExpiryRejectsBeforePasswordChanges() throws Exception {
        var owner = identity();
        String first = issue(owner);
        Otp previous = storage.getOtp(owner.email());
        String next = issue(owner);
        Otp current = storage.getOtp(owner.email());
        assertNotSame(previous, current);
        assertFalse(storage.removeOtp(owner.email(), previous));
        assertEquals(next, storage.getOtp(owner.email()).getCode());
        if (!first.equals(next))
            assertEquals(400, reset(owner, first, "Changed-password-123").status());
        storage.storeOtp(new Otp(owner.id(), owner.email(), next, Instant.now().minusSeconds(1)));
        var expired = reset(owner, next, "Changed-password-123");
        assertEquals(400, expired.status());
        assertEquals("OTP_EXPIRED", expired.data().get("code").asText());
        assertEquals(200, call("GET", "/api/v1/me", owner.token(), null).status());
    }

    @Test
    void failedResendKeepsPreviouslyDeliveredCode() throws Exception {
        var owner = identity();
        String code = issue(owner);
        doThrow(new ResponseStatusException(HttpStatus.BAD_GATEWAY, "EMAIL_DELIVERY_FAILED"))
                .when(mail)
                .sendOtp(eq(owner.email()), anyString());
        var failed = call("POST", "/api/v1/email/send-otp", null, Map.of("email", owner.email()));
        assertEquals(502, failed.status());
        assertEquals("EMAIL_DELIVERY_FAILED", failed.data().get("code").asText());
        assertEquals(code, storage.getOtp(owner.email()).getCode());
        assertEquals(204, reset(owner, code, "Changed-password-123").status());
    }

    @Test
    void validationAndMismatchedPasswordsDoNotConsumeOtp() throws Exception {
        var owner = identity();
        assertEquals(
                400,
                call("POST", "/api/v1/email/send-otp", null, Map.of("email", "invalid")).status());
        assertEquals(
                404,
                call(
                                "POST",
                                "/api/v1/email/send-otp",
                                null,
                                Map.of("email", "missing-" + UUID.randomUUID() + "@example.test"))
                        .status());
        String code = issue(owner);
        var mismatch =
                call(
                        "POST",
                        "/api/v1/auth/password-reset/confirm",
                        null,
                        Map.of(
                                "email",
                                owner.email(),
                                "otp",
                                code,
                                "password",
                                "Changed-password-123",
                                "confirm_password",
                                "Different-password-123"));
        assertEquals(400, mismatch.status());
        assertEquals("PASSWORDS_DO_NOT_MATCH", mismatch.data().get("code").asText());
        assertNotNull(storage.getOtp(owner.email()));
        assertEquals(400, reset(owner, code, "é".repeat(40)).status());
        assertNotNull(storage.getOtp(owner.email()));
        assertEquals(204, reset(owner, code, "Changed-password-123").status());
    }

    @Test
    void changedOrReassignedEmailCannotUsePreviousAccountsOtp() throws Exception {
        var owner = identity();
        String code = issue(owner);
        db.update("UPDATE accounts SET email=? WHERE id=?", "new-" + owner.email(), owner.id());
        var other = identity();
        db.update("UPDATE accounts SET email=? WHERE id=?", owner.email(), other.id());
        assertEquals(400, reset(owner, code, "Changed-password-123").status());
        assertEquals(200, call("GET", "/api/v1/me", owner.token(), null).status());
        assertEquals(200, call("GET", "/api/v1/me", other.token(), null).status());
    }

    @Test
    void ambiguousOrLockedAccountsDoNotReceiveOtp() throws Exception {
        var owner = identity();
        var other = identity();
        db.update("UPDATE accounts SET email=? WHERE id=?", owner.email(), other.id());
        assertEquals(
                409,
                call("POST", "/api/v1/email/send-otp", null, Map.of("email", owner.email()))
                        .status());
        db.update("UPDATE accounts SET status='LOCKED' WHERE id IN (?,?)", owner.id(), other.id());
        assertEquals(
                404,
                call("POST", "/api/v1/email/send-otp", null, Map.of("email", owner.email()))
                        .status());
        verifyNoInteractions(mail);
    }

    private Identity identity() throws Exception {
        String phone = phone();
        long id = register(phone);
        String email = "otp-" + UUID.randomUUID() + "@example.test";
        db.update("UPDATE accounts SET email=? WHERE id=?", email, id);
        return new Identity(id, phone, email, login(phone));
    }

    private String issue(Identity owner) throws Exception {
        var sent =
                call(
                        "POST",
                        "/api/v1/email/send-otp",
                        null,
                        Map.of("email", owner.email().toUpperCase(Locale.ROOT)));
        assertEquals(202, sent.status(), sent.body());
        var code = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).sendOtp(eq(owner.email()), code.capture());
        return code.getValue();
    }

    private Result reset(Identity owner, String code, String password) throws Exception {
        return call(
                "POST",
                "/api/v1/auth/password-reset/confirm",
                null,
                Map.of(
                        "email",
                        owner.email(),
                        "otp",
                        code,
                        "password",
                        password,
                        "confirm_password",
                        password));
    }

    private Map<String, String> passwordBody(String code, String password) {
        return Map.of("otp", code, "password", password, "confirm_password", password);
    }

    private String wrong(String code) {
        return code.equals("000000") ? "000001" : "000000";
    }
}
