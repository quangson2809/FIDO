package com.fido.modules.account;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import java.util.HashMap;
import java.util.Map;
class AddressHttpTests extends AccountHttpSupport {
    private static Map<String,Object> address(String line) {
        return Map.of("recipient_name","Test Recipient","recipient_phone","0901234567","province","Hà Nội",
                "district","Cầu Giấy","ward","Dịch Vọng","address_line",line);
    }
    @Test void structuredAddressesAreOwnedAndNeverAcceptActorFromClient() throws Exception {
        String one=phone(); register(one); String token=login(one);
        String two=phone(); register(two); String other=login(two);
        var added=call("POST","/api/v1/me/addresses",token,address("Test address"));
        assertEquals(201,added.status(),added.body()); long id=added.data().get("data").get("id").asLong();
        assertTrue(added.data().get("data").get("is_default").asBoolean());
        assertEquals("Test Recipient",added.data().get("data").get("recipient_name").asText());
        String path="/api/v1/me/addresses/"+id;
        assertEquals(404,call("PATCH",path,other,Map.of("address_line","Other")).status());
        assertEquals(404,call("DELETE",path,other,null).status());
        Map<String,Object> forged=new HashMap<>(address("Test")); forged.put("account_id",999);
        assertEquals(400,call("POST","/api/v1/me/addresses",token,forged).status());
        assertEquals(200,call("PATCH",path,token,Map.of("address_line","Updated")).status());
        var me=call("GET","/api/v1/me",token,null);
        assertEquals("Updated",me.data().get("data").get("addresses").get(0).get("address_line").asText());
        assertEquals(204,call("DELETE",path,token,null).status());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM addresses WHERE id=?",Integer.class,id));
    }
    @Test void firstAddressBecomesDefaultAndExplicitDefaultSwitchIsAtomic() throws Exception {
        String phone=phone(); register(phone); String token=login(phone);
        var first=call("POST","/api/v1/me/addresses",token,address("First"));
        Map<String,Object> secondInput=new HashMap<>(address("Second")); secondInput.put("is_default",true);
        var second=call("POST","/api/v1/me/addresses",token,secondInput);
        assertEquals(201,first.status(),first.body()); assertEquals(201,second.status(),second.body());
        long firstId=first.data().get("data").get("id").asLong(); long secondId=second.data().get("data").get("id").asLong();
        assertFalse(db.queryForObject("SELECT is_default FROM addresses WHERE id=?",Boolean.class,firstId));
        assertTrue(db.queryForObject("SELECT is_default FROM addresses WHERE id=?",Boolean.class,secondId));
    }

    @Test void legacyAddressesWithoutDefaultsAreRepairedBeforePatch() throws Exception {
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
        long firstId = db.queryForObject(
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
        long secondId = db.queryForObject(
                "SELECT MAX(id) FROM addresses WHERE account_id=?", Long.class, accountId);

        var patched = call("PATCH", "/api/v1/me/addresses/" + firstId, token, address("migrated address"));
        assertEquals(200, patched.status(), patched.body());
        assertFalse(db.queryForObject("SELECT is_default FROM addresses WHERE id=?", Boolean.class, firstId));
        assertTrue(db.queryForObject("SELECT is_default FROM addresses WHERE id=?", Boolean.class, secondId));
        assertEquals(1, db.queryForObject(
                "SELECT COUNT(*) FROM addresses WHERE account_id=? AND is_default=TRUE",
                Integer.class, accountId));
    }

    @Test void soleAddressCannotBeUnsetAsDefault() throws Exception {
        String phone=phone(); register(phone); String token=login(phone);
        var created=call("POST","/api/v1/me/addresses",token,address("Only address"));
        assertEquals(201,created.status(),created.body());
        long id=created.data().get("data").get("id").asLong();
        var patch=call("PATCH","/api/v1/me/addresses/"+id,token,Map.of("is_default",false));
        assertEquals(200,patch.status(),patch.body());
        assertTrue(patch.data().get("data").get("is_default").asBoolean());
        assertEquals(1,db.queryForObject(
                "SELECT COUNT(*) FROM addresses WHERE account_id=(SELECT id FROM accounts WHERE phone=?) AND is_default=TRUE",
                Integer.class,phone));
    }
}
