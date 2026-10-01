package com.fido.config.devseed;

import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("dev")
public class DevDataSeedConfiguration {

    @Bean
    @ConditionalOnProperty(
            name = "app.dev-seed.enabled",
            havingValue = "true"
    )
    ApplicationRunner seedDevelopmentData(
            DevDataSeedService seeder
    ) {
        return args -> seeder.seed();
    }
}
