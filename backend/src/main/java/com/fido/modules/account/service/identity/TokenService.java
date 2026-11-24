package com.fido.modules.account.service.identity;

import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.LoginResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final String issuer;
    private final long ttl;

    public TokenService(
            JwtEncoder encoder,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.ttl-seconds}") long ttl) {
        if (ttl <= 0) {
            throw new IllegalArgumentException("JWT TTL must be positive");
        }

        this.encoder = encoder;
        this.issuer = issuer;
        this.ttl = ttl;
    }

    /**
     * account là tài khoản đã được service xác thực hoặc vừa đăng ký thành công; subject JWT là
     * account.id.
     * issuer và ttl lấy cấu hình máy chủ, ttl tính bằng giây; quyền không được lấy từ dữ liệu client.
     */
    public LoginResponse issue(AccountDto account) {
        return issue(account, 0L);
    }

    public LoginResponse issue(AccountDto account, long authVersion) {
        Instant now = Instant.now();

        var claims =
                JwtClaimsSet.builder()
                        .issuer(issuer)
                        .subject(account.id().toString())
                        .claim("account_version", authVersion)
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(ttl))
                        .build();

        var header = JwsHeader.with(MacAlgorithm.HS256).build();

        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        return new LoginResponse(token, "Bearer", ttl, account);
    }
}
