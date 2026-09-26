package com.fido.modules.account.service;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import com.fido.modules.account.dto.response.*;

@Service
public class TokenService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final long ttl;
    public TokenService(JwtEncoder encoder,@Value("${app.jwt.issuer}") String issuer,
                        @Value("${app.jwt.ttl-seconds}") long ttl) {
        if(ttl<=0) throw new IllegalArgumentException("JWT TTL must be positive");
        this.encoder=encoder; this.issuer=issuer; this.ttl=ttl;
    }
    public LoginResponse issue(AccountDto account) {
        Instant now=Instant.now();
        var claims=JwtClaimsSet.builder().issuer(issuer).subject(account.account_id().toString())
            .issuedAt(now).expiresAt(now.plusSeconds(ttl)).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return new LoginResponse(token,"Bearer",ttl,account);
    }
}
