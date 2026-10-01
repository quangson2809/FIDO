package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.LoginRequest;
import com.fido.modules.account.dto.request.RegisterRequest;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.LoginResponse;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthenticationService {

    private final AccountRepository accounts;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final String dummyHash;

    public AuthenticationService(
            AccountRepository accounts,
            PasswordEncoder passwords,
            TokenService tokens
    ) {
        this.accounts = accounts;
        this.passwords = passwords;
        this.tokens = tokens;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public AccountDto register(RegisterRequest request) {
        if (accounts.existsByPhone(request.phone())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        Account account = new Account();
        account.setPhone(request.phone());
        account.setEmail(request.email());
        account.setPasswordHash(hashPassword(request.password()));

        return AccountMapper.account(
                accounts.save(account)
        );
    }

    public String hashPassword(String raw) {
        // BCrypt has a 72-byte limit; do not silently truncate passwords.
        if (raw == null
                || raw.isBlank()
                || raw.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        return passwords.encode(raw);
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        var account = accounts.findByPhone(request.identifier());

        boolean matches = false;

        try {
            matches = passwords.matches(
                    request.password(),
                    account.map(Account::getPasswordHash).orElse(dummyHash)
            );
        } catch (IllegalArgumentException ignored) {
            // Invalid encoded password is handled as an unauthorized login below.
        }

        if (account.isEmpty() || !matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return tokens.issue(
                AccountMapper.account(account.get())
        );
    }
}
