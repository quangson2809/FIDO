package com.fido.modules.account;

import com.fido.modules.account.service.SuperadminBootstrapService;
import java.net.URI;
import java.net.http.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AccountPhase2HttpTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired JwtEncoder encoder;
    @Autowired PasswordEncoder passwords;
    @Autowired SuperadminBootstrapService bootstrap;
    final HttpClient client=HttpClient.newHttpClient();
    static final String PASSWORD="Test-password-123";
    final List<Long> created=new ArrayList<>();
    final List<Long> roleIds=new ArrayList<>();
    final List<Long> permissionIds=new ArrayList<>();

    record Result(int status,JsonNode data,String body) {}
    Result call(String method,String path,String token,Object body) throws Exception {
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path)).header("Accept","application/json");
        if(token!=null)b.header("Authorization","Bearer "+token);
        b.header("Content-Type","application/json");
        b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var r=client.send(b.build(),HttpResponse.BodyHandlers.ofString());
        return new Result(r.statusCode(),r.body().isBlank()?null:json.readTree(r.body()),r.body());
    }
    String phone() {return "09"+UUID.randomUUID().toString().replace("-", "").substring(0,16);}
    long register(String phone) throws Exception {
        var r=call("POST","/api/v1/auth/register",null,Map.of("phone",phone,"password",PASSWORD));
        assertEquals(201,r.status,r.body);long id=r.data.get("data").get("account_id").asLong();created.add(id);return id;
    }
    String login(String phone) throws Exception {
        var r=call("POST","/api/v1/auth/login",null,Map.of("identifier",phone,"password",PASSWORD));
        assertEquals(200,r.status,r.body);return r.data.get("data").get("access_token").asText();
    }
    void grant(long id,String role) {db.update("INSERT INTO account_roles SELECT ?,role_id FROM roles WHERE code=?",id,role);}
    String root() throws Exception {String p=phone();long id=register(p);grant(id,"SUPERADMIN");return login(p);}
    @AfterEach void clean() {
        for(Long id:created) {
            db.update("DELETE FROM audit_logs WHERE actor_account_id=?",id);
            db.update("DELETE FROM addresses WHERE account_id=?",id);
            db.update("DELETE FROM account_roles WHERE account_id=?",id);
            db.update("DELETE FROM accounts WHERE account_id=?",id);
        }
        for(Long id:roleIds) {db.update("DELETE FROM role_permissions WHERE role_id=?",id);db.update("DELETE FROM roles WHERE role_id=?",id);}
        for(Long id:permissionIds) db.update("DELETE FROM permissions WHERE permission_id=?",id);
    }
    @Test void registrationLoginAndProfileContract() throws Exception {
        String p=phone();long id=register(p);String token=login(p);
        String stored=db.queryForObject("SELECT password_hash FROM accounts WHERE account_id=?",String.class,id);
        assertNotEquals(PASSWORD,stored);assertTrue(passwords.matches(PASSWORD,stored));
        var me=call("GET","/api/v1/me",token,null);assertEquals(200,me.status);
        assertEquals(id,me.data.get("data").get("account").get("account_id").asLong());
        assertEquals(0,me.data.get("data").get("roles").size());assertFalse(me.body.contains("password"));
        assertEquals(200,call("PATCH","/api/v1/me",token,Map.of("email","person@example.test")).status);
        assertEquals(p,db.queryForObject("SELECT phone FROM accounts WHERE account_id=?",String.class,id));
        assertEquals(200,call("PATCH","/api/v1/me",token,Map.of()).status);
        assertEquals(400,call("POST","/api/v1/auth/register",null,Map.of("phone",phone(),"password","x".repeat(73))).status);
        assertEquals(400,call("POST","/api/v1/auth/register",null,Map.of("phone",phone(),"password"," ")).status);
        assertEquals(400,call("POST","/api/v1/auth/register",null,Map.of("phone",phone(),"password",PASSWORD,"role","SUPERADMIN")).status);
        assertEquals(400,call("PATCH","/api/v1/me",token,Collections.singletonMap("phone",null)).status);
        assertEquals(401,call("POST","/api/v1/auth/login",null,Map.of("identifier",p,"password","wrong")).status);
        assertEquals(401,call("POST","/api/v1/auth/login",null,Map.of("identifier",phone(),"password","wrong")).status);
    }
    @Test void uniquePhoneAndConcurrentRegistration() throws Exception {
        String p=phone();long id=register(p);
        assertEquals(409,call("POST","/api/v1/auth/register",null,Map.of("phone",p,"password",PASSWORD)).status);
        String other=phone();register(other);
        assertEquals(409,call("PATCH","/api/v1/me",login(other),Map.of("phone",p)).status);
        String concurrent=phone();var executor=Executors.newFixedThreadPool(2);
        try {
            var gate=new CountDownLatch(1);
            Callable<Result> task=()->{gate.await();return call("POST","/api/v1/auth/register",null,Map.of("phone",concurrent,"password",PASSWORD));};
            var a=executor.submit(task);var b=executor.submit(task);gate.countDown();
            var results=List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS));
            assertEquals(List.of(201,409),results.stream().map(Result::status).sorted().toList());
            for(var r:results)if(r.status==201)created.add(r.data.get("data").get("account_id").asLong());
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM accounts WHERE phone=?",Integer.class,concurrent));
        } finally {executor.shutdownNow();}
    }
    @Test void addressesAreOwnedAndNeverAcceptActorFromClient() throws Exception {
        String p=phone();register(p);String a=login(p);String q=phone();register(q);String b=login(q);
        var added=call("POST","/api/v1/me/addresses",a,Map.of("address_text","Test address"));assertEquals(201,added.status);
        long id=added.data.get("data").get("address_id").asLong();String path="/api/v1/me/addresses/"+id;
        assertEquals(404,call("PATCH",path,b,Map.of("address_text","Other")).status);
        assertEquals(404,call("DELETE",path,b,null).status);
        assertEquals(400,call("POST","/api/v1/me/addresses",a,Map.of("address_text","Test","account_id",999)).status);
        assertEquals(200,call("PATCH",path,a,Map.of("address_text","Updated")).status);
        assertEquals(204,call("DELETE",path,a,null).status);
    }
    @Test void adminDoesNotInheritSuperadminAndRevocationAppliesImmediately() throws Exception {
        String p=phone();long id=register(p);grant(id,"ADMIN");String token=login(p);
        for(String path:List.of("/api/v1/admin/staff-accounts","/api/v1/admin/permissions","/api/v1/admin/access-control")) {
            assertEquals(401,call("GET",path,null,null).status);
            assertEquals(403,call("GET",path,token,null).status);
        }
        grant(id,"SUPERADMIN");assertEquals(200,call("GET","/api/v1/admin/access-control",token,null).status);
        db.update("DELETE FROM account_roles WHERE account_id=? AND role_id=(SELECT role_id FROM roles WHERE code='SUPERADMIN')",id);
        assertEquals(403,call("GET","/api/v1/admin/access-control",token,null).status);
    }
    @Test void invalidExpiredAndIncompleteTokensAreRejected() throws Exception {
        String p=phone();long id=register(p);String token=login(p);
        assertEquals(401,call("GET","/api/v1/me",null,null).status);
        assertEquals(401,call("GET","/api/v1/me","not-a-jwt",null).status);
        String[] parts=token.split("\\.");parts[2]=(parts[2].startsWith("A")?"B":"A")+parts[2].substring(1);
        assertEquals(401,call("GET","/api/v1/me",String.join(".",parts),null).status);
        for(String mode:List.of("expired","missing_exp","missing_iat","invalid_sub","wrong_issuer")) {
            var claims=JwtClaimsSet.builder().issuer(mode.equals("wrong_issuer")?"other":"fido")
                .subject(mode.equals("invalid_sub")?"abc":Long.toString(id));
            if(!mode.equals("missing_iat"))claims.issuedAt(Instant.now().minusSeconds(600));
            if(!mode.equals("missing_exp"))claims.expiresAt(Instant.now().plusSeconds(mode.equals("expired")?-300:300));
            String invalid=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims.build())).getTokenValue();
            assertEquals(401,call("GET","/api/v1/me",invalid,null).status,mode);
        }
    }
    @Test void rolePermissionCrudReplacementAuditAndRollback() throws Exception {
        String token=root();String suffix=UUID.randomUUID().toString();
        assertEquals(400,call("PATCH","/api/v1/admin/roles/not-an-id",token,Map.of("name","Bad")).status);
        assertEquals(400,call("POST","/api/v1/admin/permissions",token,Map.of("code"," ","name","Bad")).status);
        var p=call("POST","/api/v1/admin/permissions",token,Map.of("code","test."+suffix,"name","Test permission"));assertEquals(201,p.status,p.body);
        long permission=p.data.get("data").get("permission_id").asLong();permissionIds.add(permission);
        assertEquals(200,call("PATCH","/api/v1/admin/permissions/"+permission,token,Map.of("name","Updated")).status);
        var permissionPage=call("GET","/api/v1/admin/permissions",token,null);
        assertEquals(200,permissionPage.status);
        assertEquals(20,permissionPage.data.get("meta").get("page_size").asInt());
        assertEquals(400,call("GET","/api/v1/admin/permissions?page_size=101",token,null).status);
        var r=call("POST","/api/v1/admin/roles",token,Map.of("code","test."+suffix,"name","Role","permission_ids",List.of(permission)));
        assertEquals(201,r.status,r.body);long role=r.data.get("data").get("role_id").asLong();roleIds.add(role);
        assertEquals(409,call("DELETE","/api/v1/admin/permissions/"+permission,token,null).status);
        assertEquals(404,call("PATCH","/api/v1/admin/roles/"+role,token,Map.of("name","Must rollback","permission_ids",List.of(Long.MAX_VALUE))).status);
        assertEquals("Role",db.queryForObject("SELECT name FROM roles WHERE role_id=?",String.class,role));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM role_permissions WHERE role_id=?",Integer.class,role));
        var patch=new HashMap<String,Object>();patch.put("description",null);patch.put("permission_ids",List.of());
        assertEquals(200,call("PATCH","/api/v1/admin/roles/"+role,token,patch).status);
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM role_permissions WHERE role_id=?",Integer.class,role));
        assertEquals(204,call("DELETE","/api/v1/admin/permissions/"+permission,token,null).status);permissionIds.remove(permission);
        assertEquals(204,call("DELETE","/api/v1/admin/roles/"+role,token,null).status);roleIds.remove(role);
        assertTrue(db.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE action='ROLE_CREATE' AND target_id=?",Integer.class,Long.toString(role))>0);
    }
    @Test void staffQueriesRoleReplacementAndSystemRoleProtection() throws Exception {
        String token=root();String p=phone();
        var added=call("POST","/api/v1/admin/staff-accounts",token,Map.of("phone",p,"password",PASSWORD));
        assertEquals(201,added.status,added.body);long id=added.data.get("data").get("account").get("account_id").asLong();created.add(id);
        long admin=db.queryForObject("SELECT role_id FROM roles WHERE code='ADMIN'",Long.class);
        assertEquals("ADMIN",added.data.get("data").get("roles").get(0).get("code").asText());
        assertEquals(200,call("GET","/api/v1/admin/staff-accounts/"+id,token,null).status);
        var page=call("GET","/api/v1/admin/staff-accounts?q="+p+"&role_id="+admin,token,null);
        assertEquals(200,page.status);assertEquals(1,page.data.get("meta").get("total").asInt());assertEquals(20,page.data.get("meta").get("page_size").asInt());
        assertEquals(400,call("GET","/api/v1/admin/staff-accounts?page_size=101",token,null).status);
        assertEquals(409,call("DELETE","/api/v1/admin/roles/"+admin,token,null).status);
        assertEquals(200,call("PATCH","/api/v1/admin/staff-accounts/"+id,token,Map.of("email","staff@example.test","role_ids",List.of())).status);
        assertEquals(404,call("GET","/api/v1/admin/staff-accounts/"+id,token,null).status);
        var me=call("GET","/api/v1/me",token,null);long rootId=me.data.get("data").get("account").get("account_id").asLong();
        assertEquals(409,call("PATCH","/api/v1/admin/staff-accounts/"+rootId,token,Map.of("role_ids",List.of(admin))).status);
    }
    @Test void bootstrapIsIdempotentAndDoesNotElevateExistingCustomer() throws Exception {
        String p=phone();bootstrap.initialize(p,PASSWORD);
        long id=db.queryForObject("SELECT account_id FROM accounts WHERE phone=?",Long.class,p);created.add(id);
        String hash=db.queryForObject("SELECT password_hash FROM accounts WHERE account_id=?",String.class,id);
        bootstrap.initialize(p,"Different-password");
        assertEquals(hash,db.queryForObject("SELECT password_hash FROM accounts WHERE account_id=?",String.class,id));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM account_roles WHERE account_id=?",Integer.class,id));
        String customer=phone();register(customer);
        assertThrows(IllegalStateException.class,()->bootstrap.initialize(customer,PASSWORD));
    }
}
