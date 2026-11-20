package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.modules.account.dto.request.AddressRequest;
import com.fido.modules.account.service.ProfileCommandService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class AddressHttpTests extends AccountHttpSupport {
    @Autowired ProfileCommandService commands;

    @Autowired PlatformTransactionManager transactions;

    private static Map<String, Object> address(String line) {
        return Map.of(
                "recipient_name",
                "Test Recipient",
                "recipient_phone",
                "0901234567",
                "province",
                "Hà Nội",
                "district",
                "Cầu Giấy",
                "ward",
                "Dịch Vọng",
                "address_line",
                line);
    }

    @Test
    void structuredAddressesAreOwnedAndNeverAcceptActorFromClient() throws Exception {
        String one = phone();
        register(one);
        String token = login(one);
        String two = phone();
        register(two);
        String other = login(two);
        var added = call("POST", "/api/v1/me/addresses", token, address("Test address"));
        assertEquals(201, added.status(), added.body());
        long id = added.data().get("data").get("id").asLong();
        assertTrue(added.data().get("data").get("is_default").asBoolean());
        assertEquals("Test Recipient", added.data().get("data").get("recipient_name").asText());
        String path = "/api/v1/me/addresses/" + id;
        assertEquals(404, call("PATCH", path, other, Map.of("address_line", "Other")).status());
        assertEquals(404, call("DELETE", path, other, null).status());
        Map<String, Object> forged = new HashMap<>(address("Test"));
        forged.put("account_id", 999);
        assertEquals(400, call("POST", "/api/v1/me/addresses", token, forged).status());
        assertEquals(200, call("PATCH", path, token, Map.of("address_line", "Updated")).status());
        var me = call("GET", "/api/v1/me", token, null);
        assertEquals(
                "Updated",
                me.data().get("data").get("addresses").get(0).get("address_line").asText());
        assertEquals(204, call("DELETE", path, token, null).status());
        assertEquals(
                0,
                db.queryForObject("SELECT COUNT(*) FROM addresses WHERE id=?", Integer.class, id));
    }

    @Test
    void firstAddressBecomesDefaultAndExplicitDefaultSwitchIsAtomic() throws Exception {
        String phone = phone();
        register(phone);
        String token = login(phone);
        var first = call("POST", "/api/v1/me/addresses", token, address("First"));
        Map<String, Object> secondInput = new HashMap<>(address("Second"));
        secondInput.put("is_default", true);
        var second = call("POST", "/api/v1/me/addresses", token, secondInput);
        assertEquals(201, first.status(), first.body());
        assertEquals(201, second.status(), second.body());
        long firstId = first.data().get("data").get("id").asLong();
        long secondId = second.data().get("data").get("id").asLong();
        assertFalse(
                db.queryForObject(
                        "SELECT is_default FROM addresses WHERE id=?", Boolean.class, firstId));
        assertTrue(
                db.queryForObject(
                        "SELECT is_default FROM addresses WHERE id=?", Boolean.class, secondId));
    }

    @Test
    void legacyAddressesWithoutDefaultsAreRepairedBeforePatch() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        db.update(
                """
                INSERT INTO addresses(
                    account_id,recipient_name,recipient_phone,province,district,ward,
                    address_line,is_default,created_at,updated_at
                ) VALUES (?, 'Legacy first', '0900000001', 'Hà Nội', 'Cầu Giấy',
                    'Dịch Vọng', 'legacy first', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                accountId);
        long firstId =
                db.queryForObject(
                        "SELECT MAX(id) FROM addresses WHERE account_id=?", Long.class, accountId);
        db.update(
                """
                INSERT INTO addresses(
                    account_id,recipient_name,recipient_phone,province,district,ward,
                    address_line,is_default,created_at,updated_at
                ) VALUES (?, 'Legacy second', '0900000002', 'Hà Nội', 'Cầu Giấy',
                    'Dịch Vọng', 'legacy second', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                accountId);
        long secondId =
                db.queryForObject(
                        "SELECT MAX(id) FROM addresses WHERE account_id=?", Long.class, accountId);

        var patched =
                call(
                        "PATCH",
                        "/api/v1/me/addresses/" + firstId,
                        token,
                        address("migrated address"));
        assertEquals(200, patched.status(), patched.body());
        assertFalse(
                db.queryForObject(
                        "SELECT is_default FROM addresses WHERE id=?", Boolean.class, firstId));
        assertTrue(
                db.queryForObject(
                        "SELECT is_default FROM addresses WHERE id=?", Boolean.class, secondId));
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM addresses WHERE account_id=? AND is_default=TRUE",
                        Integer.class,
                        accountId));
    }

    @Test
    void soleAddressCannotBeUnsetAsDefault() throws Exception {
        String phone = phone();
        register(phone);
        String token = login(phone);
        var created = call("POST", "/api/v1/me/addresses", token, address("Only address"));
        assertEquals(201, created.status(), created.body());
        long id = created.data().get("data").get("id").asLong();
        var patch = call("PATCH", "/api/v1/me/addresses/" + id, token, Map.of("is_default", false));
        assertEquals(200, patch.status(), patch.body());
        assertTrue(patch.data().get("data").get("is_default").asBoolean());
        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM addresses WHERE account_id=(SELECT id FROM accounts WHERE phone=?) AND is_default=TRUE",
                        Integer.class,
                        phone));
    }

    @Test
    void switchingDefaultPreservesPatchedFieldsAndReturnsTheCurrentDatabaseState()
            throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        createAddress(token, "First");
        long secondId = createAddress(token, "Second");

        var response =
                call(
                        "PATCH",
                        "/api/v1/me/addresses/" + secondId,
                        token,
                        Map.of("is_default", true, "address_line", "Updated second"));

        assertEquals(200, response.status(), response.body());
        assertTrue(response.data().get("data").get("is_default").asBoolean());
        assertEquals("Updated second", response.data().get("data").get("address_line").asText());
        assertDefaultAddress(accountId, secondId);
        assertEquals(
                "Updated second",
                db.queryForObject(
                        "SELECT address_line FROM addresses WHERE id=?", String.class, secondId));
    }

    @Test
    void unsettingAndDeletingDefaultsPromotesTheLatestRemainingAddress() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        long firstId = createAddress(token, "First");
        long secondId = createAddress(token, "Second");
        long thirdId = createAddress(token, "Third");
        db.update(
                "UPDATE addresses SET updated_at='2020-01-01 00:00:00' WHERE id IN (?,?)",
                secondId,
                thirdId);

        var unset =
                call(
                        "PATCH",
                        "/api/v1/me/addresses/" + firstId,
                        token,
                        Map.of("is_default", false));
        assertEquals(200, unset.status(), unset.body());
        assertFalse(unset.data().get("data").get("is_default").asBoolean());
        assertDefaultAddress(accountId, thirdId);

        assertEquals(204, call("DELETE", "/api/v1/me/addresses/" + thirdId, token, null).status());
        assertDefaultAddress(accountId, firstId);
        assertEquals(204, call("DELETE", "/api/v1/me/addresses/" + firstId, token, null).status());
        assertDefaultAddress(accountId, secondId);
        assertEquals(204, call("DELETE", "/api/v1/me/addresses/" + secondId, token, null).status());
        assertEquals(
                0,
                db.queryForObject(
                        "SELECT COUNT(*) FROM addresses WHERE account_id=?",
                        Integer.class,
                        accountId));
    }

    @Test
    void repairingMultipleDefaultsKeepsTheLatestExistingDefaultAndTheRequestedPatch()
            throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        long firstId = createAddress(token, "First");
        long secondId = createAddress(token, "Second");
        long thirdId = createAddress(token, "Third");
        db.update(
                "UPDATE addresses SET is_default=TRUE, updated_at='2020-01-01 00:00:00' WHERE id=?",
                firstId);
        db.update(
                "UPDATE addresses SET is_default=TRUE, updated_at='2021-01-01 00:00:00' WHERE id=?",
                secondId);
        db.update("UPDATE addresses SET updated_at='2025-01-01 00:00:00' WHERE id=?", thirdId);

        var response =
                call(
                        "PATCH",
                        "/api/v1/me/addresses/" + thirdId,
                        token,
                        Map.of("address_line", "Updated third"));

        assertEquals(200, response.status(), response.body());
        assertFalse(response.data().get("data").get("is_default").asBoolean());
        assertEquals("Updated third", response.data().get("data").get("address_line").asText());
        assertDefaultAddress(accountId, secondId);
    }

    @Test
    void failedTransactionRollsBackDefaultSwitchAndAddressFields() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        long firstId = createAddress(token, "First");
        long secondId = createAddress(token, "Second");
        var patch = new AddressRequest();
        patch.setAddress_line("Must roll back");
        patch.setIs_default(true);

        assertThrows(
                IllegalStateException.class,
                () ->
                        new TransactionTemplate(transactions)
                                .executeWithoutResult(
                                        transaction -> {
                                            assertTrue(
                                                    commands.updateAddress(
                                                                    accountId, secondId, patch)
                                                            .is_default());
                                            throw new IllegalStateException("intentional rollback");
                                        }));

        assertDefaultAddress(accountId, firstId);
        assertEquals(
                "Second",
                db.queryForObject(
                        "SELECT address_line FROM addresses WHERE id=?", String.class, secondId));
    }

    @Test
    void concurrentDefaultSwitchesKeepExactlyOneDefaultAndBothFieldUpdates() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = login(phone);
        long firstId = createAddress(token, "First");
        long secondId = createAddress(token, "Second");
        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);

        try {
            var first =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                        "PATCH",
                                        "/api/v1/me/addresses/" + firstId,
                                        token,
                                        Map.of(
                                                "is_default",
                                                true,
                                                "address_line",
                                                "Updated first"));
                            });
            var second =
                    executor.submit(
                            () -> {
                                start.await();
                                return call(
                                        "PATCH",
                                        "/api/v1/me/addresses/" + secondId,
                                        token,
                                        Map.of(
                                                "is_default",
                                                true,
                                                "address_line",
                                                "Updated second"));
                            });
            start.countDown();

            for (var result :
                    List.of(first.get(30, TimeUnit.SECONDS), second.get(30, TimeUnit.SECONDS))) {
                assertEquals(200, result.status(), result.body());
            }
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM addresses WHERE account_id=? AND is_default=TRUE",
                            Integer.class,
                            accountId));
            assertEquals(
                    "Updated first",
                    db.queryForObject(
                            "SELECT address_line FROM addresses WHERE id=?",
                            String.class,
                            firstId));
            assertEquals(
                    "Updated second",
                    db.queryForObject(
                            "SELECT address_line FROM addresses WHERE id=?",
                            String.class,
                            secondId));
        } finally {
            executor.shutdownNow();
        }
    }

    private long createAddress(String token, String line) throws Exception {
        var response = call("POST", "/api/v1/me/addresses", token, address(line));
        assertEquals(201, response.status(), response.body());
        return response.data().get("data").get("id").asLong();
    }

    private void assertDefaultAddress(long accountId, long addressId) {
        assertEquals(
                List.of(addressId),
                db.queryForList(
                        "SELECT id FROM addresses WHERE account_id=? AND is_default=TRUE",
                        Long.class,
                        accountId));
    }
}
