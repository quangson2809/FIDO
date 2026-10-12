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
