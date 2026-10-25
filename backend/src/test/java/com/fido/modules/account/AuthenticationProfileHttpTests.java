package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class AuthenticationProfileHttpTests extends AccountHttpSupport {

    @Test
    void registrationLoginAndProfileContract() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);

        String storedHash =
                db.queryForObject(
                        "SELECT password_hash FROM accounts WHERE account_id=?",
                        String.class,
                        accountId);

        assertNotEquals(PASSWORD, storedHash);
        assertTrue(passwords.matches(PASSWORD, storedHash));

        var me = call("GET", "/api/v1/me", token, null);
        assertEquals(200, me.status());
        assertEquals(accountId, me.data().get("data").get("account").get("account_id").asLong());
        assertEquals(1, me.data().get("data").get("roles").size());
        assertFalse(me.body().contains("password"));

        assertEquals(
                200,
                call("PATCH", "/api/v1/me", token, Map.of("email", "person@example.test"))
                        .status());

        assertEquals(
                phone,
                db.queryForObject(
                        "SELECT phone FROM accounts WHERE account_id=?", String.class, accountId));

        assertEquals(200, call("PATCH", "/api/v1/me", token, Map.of()).status());

        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", phone(), "full_name", "Validation Test Account", "password", "x".repeat(73)))
                        .status());

        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", phone(), "full_name", "Validation Test Account", "password", " "))
                        .status());

        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", phone(), "full_name", "Validation Test Account", "password", PASSWORD, "role", "SUPERADMIN"))
                        .status());

        assertEquals(
                400,
                call("PATCH", "/api/v1/me", token, Collections.singletonMap("phone", null))
                        .status());

        assertEquals(400, call("PATCH", "/api/v1/me", token, Map.of("phone", phone)).status());

        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("identifier", phone, "password", "wrong"))
                        .status());

        assertEquals(
                401,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("identifier", phone(), "password", "wrong"))
                        .status());
    }

    @Test
    void canonicalPhoneVariantsResolveToOneIdentity() throws Exception {
        String nationalPhone = "0" + phone().substring(3);
        long accountId = register(nationalPhone);
        String internationalPhone = "+84" + nationalPhone.substring(1);

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", internationalPhone, "full_name", "Duplicate Test Account", "password", PASSWORD))
                        .status());

        var login =
                call(
                        "POST",
                        "/api/v1/auth/login",
                        null,
                        Map.of("identifier", internationalPhone, "password", PASSWORD));

        assertEquals(200, login.status(), login.body());
        assertEquals(
                internationalPhone,
                db.queryForObject(
                        "SELECT phone FROM accounts WHERE account_id=?", String.class, accountId));
    }

    @Test
    void nonActiveAccountsCannotLoginOrUseAnExistingToken() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String existingToken = login(phone);

        db.update("UPDATE accounts SET status='LOCKED' WHERE account_id=?", accountId);

        assertEquals(
                403,
                call(
                                "POST",
                                "/api/v1/auth/login",
                                null,
                                Map.of("phone", phone, "full_name", "Duplicate Test Account", "password", PASSWORD))
                        .status());
        assertEquals(401, call("GET", "/api/v1/me", existingToken, null).status());
    }

    @Test
    void softDeletedPhoneCanBeRegisteredAgain() throws Exception {
        String phone = phone();
        long oldAccountId = register(phone);

        db.update(
                "UPDATE accounts SET deleted_at=CURRENT_TIMESTAMP WHERE account_id=?",
                oldAccountId);

        var reRegistered =
                call(
                        "POST",
                        "/api/v1/auth/register",
                        null,
                        Map.of("phone", phone, "full_name", "Replacement Account", "password", PASSWORD));

        assertEquals(201, reRegistered.status(), reRegistered.body());
        long newAccountId =
                reRegistered.data().get("data").get("account").get("account_id").asLong();
        assertNotEquals(oldAccountId, newAccountId);
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM accounts WHERE phone_active_key=?",
                        Integer.class,
                        phone));
        created.add(newAccountId);
    }

    @Test
    void uniquePhoneAndConcurrentRegistration() throws Exception {
        String phone = phone();
        register(phone);

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", phone, "full_name", "Duplicate Test Account", "password", PASSWORD))
                        .status());

        assertEquals(
                409,
                call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", "0" + phone.substring(3), "full_name", "Duplicate Test Account", "password", PASSWORD))
                        .status());

        String otherPhone = phone();
        register(otherPhone);

        assertEquals(
                400,
                call("PATCH", "/api/v1/me", login(otherPhone), Map.of("phone", phone)).status());

        String concurrentPhone = phone();
        var executor = Executors.newFixedThreadPool(2);

        try {
            var gate = new CountDownLatch(1);

            Callable<Result> task =
                    () -> {
                        gate.await();
                        return call(
                                "POST",
                                "/api/v1/auth/register",
                                null,
                                Map.of("phone", concurrentPhone, "full_name", "Concurrent Test Account", "password", PASSWORD));
                    };

            var first = executor.submit(task);
            var second = executor.submit(task);
            gate.countDown();

            var results =
                    List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS));

            assertEquals(List.of(201, 409), results.stream().map(Result::status).sorted().toList());

            for (var result : results) {
                if (result.status() == 201) {
                    created.add(
                            result.data().get("data").get("account").get("account_id").asLong());
                }
            }

            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM accounts WHERE phone=? OR phone=?",
                            Integer.class,
                            concurrentPhone,
                            "0" + concurrentPhone.substring(3)));
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void invalidExpiredAndIncompleteTokensAreRejected() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);

        assertEquals(401, call("GET", "/api/v1/me", null, null).status());
        assertEquals(401, call("GET", "/api/v1/me", "not-a-jwt", null).status());

        String[] parts = token.split("\\.");
        parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        assertEquals(401, call("GET", "/api/v1/me", String.join(".", parts), null).status());

        for (String mode :
                List.of("expired", "missing_exp", "missing_iat", "invalid_sub", "wrong_issuer")) {
            var claims =
                    JwtClaimsSet.builder()
                            .issuer(mode.equals("wrong_issuer") ? "other" : "fido")
                            .subject(mode.equals("invalid_sub") ? "abc" : Long.toString(accountId));

            if (!mode.equals("missing_iat")) {
                claims.issuedAt(Instant.now().minusSeconds(600));
            }
            if (!mode.equals("missing_exp")) {
                claims.expiresAt(Instant.now().plusSeconds(mode.equals("expired") ? -300 : 300));
            }

            String invalidToken =
                    encoder.encode(
                                    JwtEncoderParameters.from(
                                            JwsHeader.with(MacAlgorithm.HS256).build(),
                                            claims.build()))
                            .getTokenValue();

            assertEquals(401, call("GET", "/api/v1/me", invalidToken, null).status(), mode);
        }
    }
}
