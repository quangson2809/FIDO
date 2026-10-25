package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.time.Instant;
import java.util.List;

class AccountAuthorizationHttpTests extends AccountHttpSupport {

    @Test
    void adminDoesNotInheritSuperadminAndRevocationAppliesImmediately() throws Exception {
        String phone = phone();
        long accountId = register(phone);

        grant(accountId, "ADMIN");

        String token = login(phone);

        for (String path :
                List.of(
                        "/api/v1/admin/staff-accounts",
                        "/api/v1/admin/permissions",
                        "/api/v1/admin/access-control")) {
            assertEquals(401, call("GET", path, null, null).status());

            assertEquals(403, call("GET", path, token, null).status());
        }

        grant(accountId, "SUPERADMIN");

        assertEquals(200, call("GET", "/api/v1/admin/access-control", token, null).status());

        db.update(
                """
                DELETE FROM account_roles
                WHERE account_id=?
                  AND role_id=(
                      SELECT role_id
                      FROM roles
                      WHERE code='SUPERADMIN'
                  )
                """,
                accountId);

        assertEquals(403, call("GET", "/api/v1/admin/access-control", token, null).status());
    }

    @Test
    void inactiveRoleContributesNoEffectiveAuthorization() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        long permissionId =
                db.queryForObject(
                        "SELECT permission_id FROM permissions WHERE code='REPORT_READ'",
                        Long.class);
        String roleCode = "inactive-test-" + java.util.UUID.randomUUID();
        db.update("INSERT INTO roles(code,name,status) VALUES (?,?,'ACTIVE')", roleCode, "Inactive test");
        long roleId = db.queryForObject("SELECT role_id FROM roles WHERE code=?", Long.class, roleCode);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)", roleId, permissionId);
        db.update(
                "INSERT INTO account_roles(account_id,role_id) SELECT ?,role_id FROM roles WHERE code='ADMIN'",
                accountId);
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)", accountId, roleId);
        String token = login(phone);
        String reportUrl = "/api/v1/admin/reports/overview?from=2026-10-01&to=2026-10-25";

        assertEquals(200, call("GET", reportUrl, token, null).status());

        db.update("UPDATE roles SET status='INACTIVE' WHERE role_id=?", roleId);

        assertEquals(403, call("GET", reportUrl, token, null).status());

        db.update("DELETE FROM account_roles WHERE account_id=? AND role_id=?", accountId, roleId);
        db.update("DELETE FROM role_permissions WHERE role_id=?", roleId);
        db.update("DELETE FROM roles WHERE role_id=?", roleId);
    }

    @Test
    void jwtAuthorityClaimsAreIgnoredAndDatabaseAccessIsReloaded() throws Exception {
        String phone = phone();
        long accountId = register(phone);
        String token = tokenWithUntrustedAuthorities(accountId);

        assertEquals(403, call("GET", "/api/v1/admin/access-control", token, null).status());

        grant(accountId, "SUPERADMIN");

        assertEquals(200, call("GET", "/api/v1/admin/access-control", token, null).status());
    }

    private String tokenWithUntrustedAuthorities(long accountId) {
        Instant now = Instant.now();

        var claims =
                JwtClaimsSet.builder()
                        .issuer("fido")
                        .subject(Long.toString(accountId))
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(300))
                        .claim("roles", List.of("SUPERADMIN"))
                        .claim("permissions", List.of("ORDER_READ"))
                        .build();

        var header = JwsHeader.with(MacAlgorithm.HS256).build();

        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
