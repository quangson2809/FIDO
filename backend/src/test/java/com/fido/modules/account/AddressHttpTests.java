package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

import java.util.Map;

class AddressHttpTests extends AccountHttpSupport {

    @Test
    void addressesAreOwnedAndNeverAcceptActorFromClient() throws Exception {
        String firstPhone = phone();
        register(firstPhone);
        String firstToken = login(firstPhone);

        String secondPhone = phone();
        register(secondPhone);
        String secondToken = login(secondPhone);

        var added =
                call(
                        "POST",
                        "/api/v1/me/addresses",
                        firstToken,
                        Map.of("address_text", "Test address"));

        assertEquals(201, added.status());

        long addressId = added.data().get("data").get("address_id").asLong();

        String path = "/api/v1/me/addresses/" + addressId;

        assertEquals(
                404, call("PATCH", path, secondToken, Map.of("address_text", "Other")).status());

        assertEquals(404, call("DELETE", path, secondToken, null).status());

        assertEquals(
                400,
                call(
                                "POST",
                                "/api/v1/me/addresses",
                                firstToken,
                                Map.of("address_text", "Test", "account_id", 999))
                        .status());

        assertEquals(
                200, call("PATCH", path, firstToken, Map.of("address_text", "Updated")).status());

        assertEquals(204, call("DELETE", path, firstToken, null).status());
    }
}
