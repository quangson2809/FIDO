package com.fido.config.documentation;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(info = @Info(title = "FIDO API", version = "v1"))
@SecurityScheme(
        name = OpenApiConfig.BEARER_AUTH,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "Enter the raw access token returned by /api/v1/auth/login; Swagger UI adds the Bearer prefix."
)
public class OpenApiConfig {

    static final String BEARER_AUTH = "bearerAuth";

    @Bean
    OpenApiCustomizer jwtSecurityRequirements() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }

            openApi.getPaths().forEach((path, pathItem) -> {
                if (!requiresBearerJwt(path)) {
                    return;
                }

                pathItem.readOperations().forEach(operation ->
                        operation.addSecurityItem(
                                new SecurityRequirement().addList(BEARER_AUTH)
                        )
                );
            });
        };
    }

    private static boolean requiresBearerJwt(String path) {
        return isPathOrChild(path, "/api/v1/admin")
                || isPathOrChild(path, "/api/v1/me")
                || isPathOrChild(path, "/api/v1/cart")
                || "/api/v1/checkout/quote".equals(path)
                || "/api/v1/orders".equals(path);
    }

    private static boolean isPathOrChild(String path, String root) {
        return root.equals(path) || path.startsWith(root + "/");
    }
}
