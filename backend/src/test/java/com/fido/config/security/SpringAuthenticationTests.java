package com.fido.config.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fido.common.exception.ApiExceptionHandler;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Permission;
import com.fido.modules.account.entity.Role;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.PermissionRepository;
import com.fido.modules.account.repository.RoleRepository;
import com.fido.modules.account.service.identity.AccountPrincipal;
import com.fido.modules.account.service.identity.AccountUserDetailsService;
import com.fido.modules.account.service.identity.PhoneNumberCanonicalizer;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
class SpringAuthenticationTests {
    @Mock private AccountRepository accounts;
    @Mock private RoleRepository roles;
    @Mock private PermissionRepository permissions;
    private final SecurityConfig security = new SecurityConfig();
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(4);
    private AccountUserDetailsService users;
    private Account account;

    @BeforeEach
    void setUp() {
        users =
                new AccountUserDetailsService(
                        accounts, roles, permissions, new PhoneNumberCanonicalizer());
        account = new Account();
        account.setAccountId(7L);
        account.setPhone("+84900000000");
        account.setPasswordHash(passwords.encode("test-password"));
    }

    @AfterEach
    void cleanSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void providerAuthenticatesAndErasesOnlyThePrincipalCredentials() {
        String originalHash = account.getPasswordHash();
        when(accounts.findByPhoneInAndNotDeleted(List.of("+84900000000", "0900000000")))
                .thenReturn(List.of(account));
        var result =
                security.loginAuthenticationManager(users, passwords)
                        .authenticate(
                                UsernamePasswordAuthenticationToken.unauthenticated(
                                        "0900000000", "test-password"));
        assertTrue(result.isAuthenticated());
        var principal = (AccountPrincipal) result.getPrincipal();
        assertEquals(7L, principal.accountId());
        assertNull(result.getCredentials());
        assertNull(principal.getPassword());
        assertEquals(
                originalHash,
                account.getPasswordHash(),
                "credential erasure must not dirty the JPA entity");
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 2})
    void unknownWrongPasswordAndAmbiguousIdentityUseTheSameProviderFailure(int matches) {
        when(accounts.findByPhoneInAndNotDeleted(List.of("+84900000000", "0900000000")))
                .thenReturn(
                        matches == 0
                                ? List.of()
                                : matches == 1 ? List.of(account) : List.of(account, account));
        assertThrows(
                BadCredentialsException.class,
                () ->
                        security.loginAuthenticationManager(users, passwords)
                                .authenticate(
                                        UsernamePasswordAuthenticationToken.unauthenticated(
                                                "0900000000", "wrong-password")));
    }

    @ParameterizedTest
    @ValueSource(strings = {"LOCKED", "SUSPENDED", "INACTIVE"})
    void springRejectsNonActiveAccountsAtLoginAndWhenUsingAnExistingJwt(String status) {
        account.setStatus(status);
        when(accounts.findByPhoneInAndNotDeleted(List.of("+84900000000", "0900000000")))
                .thenReturn(List.of(account));
        assertThrows(
                AccountStatusException.class,
                () ->
                        security.loginAuthenticationManager(users, passwords)
                                .authenticate(
                                        UsernamePasswordAuthenticationToken.unauthenticated(
                                                "0900000000", "test-password")));
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        assertThrows(
                OAuth2AuthenticationException.class,
                () -> security.jwtAuthenticationConverter(users).convert(jwt()));
    }

    @Test
    void jwtPrincipalStaysJwtAndUsesOnlyAuthoritiesLoadedFromDatabase() {
        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        Role role = mock(Role.class);
        Permission permission = mock(Permission.class);
        when(role.getCode()).thenReturn("CUSTOMER");
        when(permission.getCode()).thenReturn("ORDER_READ");
        when(roles.findAssignedToAccount(7L)).thenReturn(List.of(role));
        when(permissions.findGrantedToAccount(7L)).thenReturn(List.of(permission));
        Jwt jwt = jwt();
        var authentication = security.jwtAuthenticationConverter(users).convert(jwt);
        assertNotNull(authentication);
        assertSame(jwt, authentication.getPrincipal());
        var names =
                authentication.getAuthorities().stream()
                        .map(authority -> authority.getAuthority())
                        .toList();
        assertTrue(names.containsAll(List.of("ROLE_CUSTOMER", "PERMISSION_ORDER_READ")));
        assertFalse(names.contains("ROLE_SUPERADMIN"));
        assertNotNull(account.getPasswordHash());
    }

    @Test
    void bearerHandlersKeepProtocolHeadersAndSafeVietnameseJson() throws Exception {
        var request = new MockHttpServletRequest("GET", "/api/v1/admin/access-control");
        var response = new MockHttpServletResponse();
        security.authenticationEntryPoint(new ApiExceptionHandler())
                .commence(request, response, new BadCredentialsException("private-password"));
        assertEquals(401, response.getStatus());
        assertTrue(response.getHeader("WWW-Authenticate").startsWith("Bearer"));
        assertTrue(response.getContentAsString().contains("đăng nhập"));
        assertFalse(response.getContentAsString().contains("private-password"));

        when(accounts.findById(7L)).thenReturn(Optional.of(account));
        SecurityContextHolder.getContext()
                .setAuthentication(security.jwtAuthenticationConverter(users).convert(jwt()));
        var denied = new MockHttpServletResponse();
        security.accessDeniedHandler(new ApiExceptionHandler())
                .handle(request, denied, new AccessDeniedException("private-permission"));
        assertEquals(403, denied.getStatus());
        assertTrue(denied.getHeader("WWW-Authenticate").startsWith("Bearer"));
        assertTrue(denied.getContentAsString().contains("không có quyền"));
        assertFalse(denied.getContentAsString().contains("private-permission"));
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("test-token")
                .header("alg", "HS256")
                .subject("7")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("roles", List.of("SUPERADMIN"))
                .build();
    }
}
