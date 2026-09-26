package com.fido.config.security;

import java.time.Instant;
import java.util.Base64;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

@Configuration
public class JwtConfig {
    @Bean SecretKey jwtKey(@Value("${app.jwt.secret-base64}") String secret) {
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(secret); }
        catch (IllegalArgumentException ex) { throw new IllegalStateException("JWT key must be base64 encoded"); }
        if (bytes.length < 32) throw new IllegalStateException("JWT key requires at least 256 bits");
        return new SecretKeySpec(bytes,"HmacSHA256");
    }
    @Bean JwtEncoder jwtEncoder(SecretKey key) {
        return NimbusJwtEncoder.withSecretKey(key).algorithm(MacAlgorithm.HS256).build();
    }
    @Bean JwtDecoder jwtDecoder(SecretKey key, @Value("${app.jwt.issuer}") String issuer) {
        NimbusJwtDecoder decoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        OAuth2TokenValidator<Jwt> claims=jwt -> {
            try {
                if (Long.parseLong(jwt.getSubject())>0 && jwt.getIssuedAt()!=null && jwt.getExpiresAt()!=null
                    && jwt.getExpiresAt().isAfter(jwt.getIssuedAt()) && !jwt.getIssuedAt().isAfter(Instant.now()))
                    return OAuth2TokenValidatorResult.success();
            } catch (RuntimeException ignored) { }
            return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token"));
        };
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(issuer),claims));
        return decoder;
    }
}
