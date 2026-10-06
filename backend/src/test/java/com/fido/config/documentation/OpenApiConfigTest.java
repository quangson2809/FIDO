package com.fido.config.documentation;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.Paths;
import org.junit.jupiter.api.Test;

class OpenApiConfigTest {

    @Test
    void declaresBearerJwtSecurityScheme() {
        SecurityScheme scheme = OpenApiConfig.class.getAnnotation(SecurityScheme.class);

        assertNotNull(scheme);
        assertEquals(OpenApiConfig.BEARER_AUTH, scheme.name());
        assertEquals(SecuritySchemeType.HTTP, scheme.type());
        assertEquals("bearer", scheme.scheme());
        assertEquals("JWT", scheme.bearerFormat());
    }

    @Test
    void appliesBearerJwtOnlyToCurrentlyAuthenticatedRoutes() {
        Operation login = new Operation();
        Operation catalog = new Operation();
        Operation profile = new Operation();
        Operation admin = new Operation();
        Operation cart = new Operation();
        Operation quote = new Operation();
        Operation createOrder = new Operation();

        OpenAPI openApi = new OpenAPI().paths(new Paths()
                .addPathItem("/api/v1/auth/login", new PathItem().post(login))
                .addPathItem("/api/v1/catalog/products", new PathItem().get(catalog))
                .addPathItem("/api/v1/me", new PathItem().get(profile))
                .addPathItem("/api/v1/admin/orders", new PathItem().get(admin))
                .addPathItem("/api/v1/cart", new PathItem().get(cart))
                .addPathItem("/api/v1/checkout/quote", new PathItem().post(quote))
                .addPathItem("/api/v1/orders", new PathItem().post(createOrder)));

        new OpenApiConfig().jwtSecurityRequirements().customise(openApi);

        assertNull(login.getSecurity());
        assertNull(catalog.getSecurity());
        assertBearerJwt(profile);
        assertBearerJwt(admin);
        assertBearerJwt(cart);
        assertBearerJwt(quote);
        assertBearerJwt(createOrder);
    }

    private static void assertBearerJwt(Operation operation) {
        assertNotNull(operation.getSecurity());
        assertEquals(1, operation.getSecurity().size());
        assertTrue(operation.getSecurity().get(0).containsKey(OpenApiConfig.BEARER_AUTH));
    }
}
