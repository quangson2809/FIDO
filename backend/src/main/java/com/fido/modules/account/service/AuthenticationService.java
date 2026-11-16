package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.LoginRequest;
import com.fido.modules.account.dto.request.RegisterRequest;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.LoginResponse;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.AccountRole;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AccountRoleRepository;
import com.fido.modules.account.repository.RoleRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@Service
public class AuthenticationService {

    private final AccountRepository accounts;
    private final AccountRoleRepository accountRoles;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;
    private final TokenService tokens;
    private final PhoneNumberCanonicalizer phoneNumbers;
    private final String dummyHash;

    public AuthenticationService(
            AccountRepository accounts,
            AccountRoleRepository accountRoles,
            RoleRepository roles,
            PasswordEncoder passwords,
            TokenService tokens,
            PhoneNumberCanonicalizer phoneNumbers) {
        this.accounts = accounts;
        this.accountRoles = accountRoles;
        this.roles = roles;
        this.passwords = passwords;
        this.tokens = tokens;
        this.phoneNumbers = phoneNumbers;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    /**
     * request là body đăng ký công khai; role CUSTOMER do máy chủ chọn, không nhận từ client.
     * Chuẩn hóa điện thoại và kiểm tra số đang dùng trước khi lưu tài khoản.
     */
    @Transactional
    public LoginResponse register(RegisterRequest request) {
        String phone = phoneNumbers.canonicalize(request.phone());
        if (accounts.existsByPhoneInAndNotDeleted(phoneNumbers.lookupValues(phone))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "PHONE_ALREADY_IN_USE");
        }

        Account account = new Account();
        account.setFullName(request.full_name().trim());
        account.setPhone(phone);
        account.setEmail(request.email());
        account.setStatus("ACTIVE");
        account.setPasswordHash(hashPassword(request.password()));
        account = accounts.save(account);

        Role customerRole =
                roles.findByCode("CUSTOMER")
                        .filter(role -> "ACTIVE".equals(role.getStatus()))
                        .orElseThrow(
                                () -> new IllegalStateException("Required ACTIVE CUSTOMER role is missing"));
        AccountRole assignment = new AccountRole();
        assignment.setAccountId(account.getAccountId());
        assignment.setRoleId(customerRole.getRoleId());
        accountRoles.save(assignment);

        // Tạo tài khoản, gán CUSTOMER và tạo phản hồi token cùng giao dịch để tránh tài khoản thiếu role.
        AccountDto accountDto = AccountMapper.account(account);
        return tokens.issue(accountDto);
    }

    public String hashPassword(String raw) {
        // BCrypt giới hạn 72 byte; từ chối mật khẩu vượt giới hạn để tránh bị cắt ngầm.
        if (raw == null
                || raw.isBlank()
                || raw.length() < 8
                || raw.length() > 128
                || raw.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        return passwords.encode(raw);
    }

    /**
     * request chứa điện thoại/mật khẩu từ body; tra cả dạng chuẩn và dạng nội địa cũ.
     * Nếu không tìm được đúng một tài khoản thì vẫn so hash giả để giảm khác biệt thời gian phản hồi.
     */
    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        String phone = phoneNumbers.canonicalize(request.phone());
        List<Account> candidates = accounts.findByPhoneInAndNotDeleted(phoneNumbers.lookupValues(phone));
        Account account = candidates.size() == 1 ? candidates.get(0) : null;

        boolean matches = false;
        try {
            matches =
                    passwords.matches(
                            request.password(),
                            account == null ? dummyHash : account.getPasswordHash());
        } catch (IllegalArgumentException ignored) {
            // Hash lưu sai định dạng vẫn được xử lý như đăng nhập sai ở bước dưới.
        }

        // Số điện thoại không tồn tại, trùng dạng cũ và sai mật khẩu cùng trả 401 để tránh lộ danh tính.
        if (account == null || !matches) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        // Tài khoản không ACTIVE không nhận token; không tiết lộ trạng thái cụ thể cho người đăng nhập.
        if (!account.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE");
        }

        return tokens.issue(AccountMapper.account(account));
    }
}
