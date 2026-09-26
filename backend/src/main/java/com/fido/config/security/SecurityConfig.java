package com.fido.config.security;

import com.fido.modules.account.service.AccountAccessService;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import java.util.ArrayList;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, AccountAccessService access) throws Exception {
        http.csrf(csrf -> csrf.disable()).cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.ERROR).permitAll()
                .requestMatchers(HttpMethod.POST,"/api/v1/auth/register","/api/v1/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET,"/api/v1/catalog/**","/api/v1/content-pages/**","/actuator/health",
                    "/v3/api-docs/**","/swagger-ui/**","/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/admin/staff-accounts/**","/api/v1/admin/access-control",
                    "/api/v1/admin/roles/**","/api/v1/admin/permissions/**").hasAuthority("ROLE_SUPERADMIN")
                .requestMatchers("/api/v1/admin/products/**","/api/v1/admin/catalog/meta",
                    "/api/v1/admin/categories/**","/api/v1/admin/brands/**",
                    "/api/v1/admin/size-systems/**","/api/v1/admin/colors/**").authenticated()
                .requestMatchers("/api/v1/me","/api/v1/me/**").authenticated()
                .anyRequest().denyAll())
            .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> jwt.jwtAuthenticationConverter(token -> {
                var account=access.findAccess(Long.valueOf(token.getSubject()))
                    .orElseThrow(() -> new OAuth2AuthenticationException("invalid_token"));
                var authorities=new ArrayList<SimpleGrantedAuthority>();
                account.roles().forEach(r -> authorities.add(new SimpleGrantedAuthority("ROLE_"+r.code())));
                account.permissions().forEach(p -> authorities.add(new SimpleGrantedAuthority("PERMISSION_"+p.code())));
                return new JwtAuthenticationToken(token,authorities);
            })));
        return http.build();
    }
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
}
