package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class SuperadminBootstrapHttpTests extends AccountHttpSupport {

    @Test
    void bootstrapIsIdempotentAndDoesNotElevateExistingCustomer() throws Exception {
        String phone = phone();

        bootstrap.initialize(phone, PASSWORD);

        long accountId =
                db.queryForObject(
                        "SELECT account_id FROM accounts WHERE phone=?", Long.class, phone);

        created.add(accountId);

        String hash =
                db.queryForObject(
                        "SELECT password_hash FROM accounts WHERE account_id=?",
                        String.class,
                        accountId);

        bootstrap.initialize(phone, "Different-password");

        assertEquals(
                hash,
                db.queryForObject(
                        "SELECT password_hash FROM accounts WHERE account_id=?",
                        String.class,
                        accountId));

        assertEquals(
                1,
                db.queryForObject(
                        "SELECT COUNT(*) FROM account_roles WHERE account_id=?",
                        Integer.class,
                        accountId));

        String customerPhone = phone();
        register(customerPhone);

        assertThrows(
                IllegalStateException.class, () -> bootstrap.initialize(customerPhone, PASSWORD));
    }
}
