package com.fido.config.security;
import com.fido.modules.account.service.SuperadminBootstrapService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;

@Configuration
public class SuperadminBootstrap {
    @Bean
    @ConditionalOnProperty(name="app.bootstrap.enabled",havingValue="true")
    ApplicationRunner bootstrapSuperadmin(SuperadminBootstrapService service,
        @Value("${app.bootstrap.phone:}") String phone,@Value("${app.bootstrap.password:}") String password) {
        return args -> service.initialize(phone,password);
    }
}
