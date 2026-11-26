package com.fido.config.security;

import com.fido.common.exception.ApiExceptionHandler;
import com.fido.modules.account.service.identity.AccountUserDetailsService;

import jakarta.servlet.DispatcherType;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.AccountStatusUserDetailsChecker;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    /** Manager này chỉ phục vụ đăng nhập mật khẩu; Resource Server giữ provider JWT của Spring. */
    @Bean
    AuthenticationManager loginAuthenticationManager(
            AccountUserDetailsService users, PasswordEncoder passwords) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(passwords);
        return new ProviderManager(List.of(provider));
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter(AccountUserDetailsService users) {
        var checker = new AccountStatusUserDetailsChecker();
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(
                jwt -> {
                    try {
                        var principal = users.loadByAccountId(Long.valueOf(jwt.getSubject()));
                        // Request JWT không dùng mật khẩu; chỉ kiểm tra trạng thái và lấy quyền
                        // hiện tại.
                        principal.eraseCredentials();
                        checker.check(principal);
                        Object versionClaim = jwt.getClaim("account_version");
                        long version =
                                versionClaim instanceof Number number ? number.longValue() : 0L;
                        if (version != principal.getAuthVersion())
                            throw new OAuth2AuthenticationException(
                                    new OAuth2Error("invalid_token"));
                        return principal.getAuthorities();
                    } catch (UsernameNotFoundException | AccountStatusException failure) {
                        throw new OAuth2AuthenticationException(
                                new OAuth2Error("invalid_token"), failure);
                    }
                });
        return converter;
    }

    @Bean
    AuthenticationEntryPoint authenticationEntryPoint(ApiExceptionHandler errors) {
        var bearer = new BearerTokenAuthenticationEntryPoint();
        return (request, response, failure) -> {
            bearer.commence(request, response, failure);
            errors.writeSecurityError(request, response, response.getStatus(), "UNAUTHENTICATED");
        };
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler(ApiExceptionHandler errors) {
        var bearer = new BearerTokenAccessDeniedHandler();
        return (request, response, failure) -> {
            bearer.handle(request, response, failure);
            errors.writeSecurityError(request, response, response.getStatus(), "FORBIDDEN");
        };
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtAuthenticationConverter jwtAuthenticationConverter,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler)
            throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(
                        auth ->
                                auth.dispatcherTypeMatchers(DispatcherType.ERROR)
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.POST,
                                                "/api/v1/auth/register",
                                                "/api/v1/auth/login",
                                                "/api/v1/email/send-otp",
                                                "/api/v1/auth/password-reset/confirm",
                                                "/api/v1/auth/email/verify-otp")
                                        .permitAll()
                                        .requestMatchers(
                                                HttpMethod.GET,
                                                "/api/v1/catalog/**",
                                                "/api/v1/content-pages/**",
                                                "/actuator/health",
                                                "/v3/api-docs/**",
                                                "/swagger-ui/**",
                                                "/swagger-ui.html")
                                        .permitAll()
                                        // Quyền chức năng được kiểm tra tại các service bằng
                                        // @PreAuthorize.
                                        .requestMatchers(
                                                "/api/v1/admin/**",
                                                "/api/v1/me",
                                                "/api/v1/me/**",
                                                "/api/v1/cart",
                                                "/api/v1/cart/**",
                                                "/api/v1/checkout/quote",
                                                "/api/v1/orders")
                                        .authenticated()
                                        .anyRequest()
                                        .denyAll())
                .oauth2ResourceServer(
                        oauth ->
                                oauth.authenticationEntryPoint(authenticationEntryPoint)
                                        .accessDeniedHandler(accessDeniedHandler)
                                        .jwt(
                                                jwt ->
                                                        jwt.jwtAuthenticationConverter(
                                                                jwtAuthenticationConverter)));
        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
