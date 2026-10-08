package com.fido.config.security;

import java.time.Instant;
import java.util.Base64;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class JwtConfig {

    @Bean
    SecretKey jwtKey(@Value("${app.jwt.secret-base64}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET_BASE64 is required");
        }

        byte[] bytes;

        try {
            bytes = Base64.getDecoder().decode(secret);
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("JWT key must be base64 encoded");
        }

        if (bytes.length < 32) {
            throw new IllegalStateException("JWT key requires at least 256 bits");
        }

        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    @Bean
    JwtEncoder jwtEncoder(SecretKey key) {
        return NimbusJwtEncoder
                .withSecretKey(key)
                .algorithm(MacAlgorithm.HS256)
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(
            SecretKey key,
            @Value("${app.jwt.issuer}") String issuer
    ) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(key)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        OAuth2TokenValidator<Jwt> claims = jwt -> {
            try {
                boolean validSubject = Long.parseLong(jwt.getSubject()) > 0;
                boolean hasIssuedAt = jwt.getIssuedAt() != null;
                boolean hasExpiresAt = jwt.getExpiresAt() != null;

                boolean validTimeline = hasIssuedAt
                        && hasExpiresAt
                        && jwt.getExpiresAt().isAfter(jwt.getIssuedAt())
                        && !jwt.getIssuedAt().isAfter(Instant.now());

                if (validSubject && validTimeline) {
                    return OAuth2TokenValidatorResult.success();
                }
            } catch (RuntimeException ignored) {
                // Invalid subject or malformed claims are handled as invalid_token below.
            }

            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token")
            );
        };

        decoder.setJwtValidator(
                new DelegatingOAuth2TokenValidator<>(
                        JwtValidators.createDefaultWithIssuer(issuer),
                        claims
                )
        );

        return decoder;
    }
}
