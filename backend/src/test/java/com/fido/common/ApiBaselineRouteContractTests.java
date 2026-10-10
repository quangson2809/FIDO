package com.fido.common;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@SpringBootTest
@ActiveProfiles("test")
class ApiBaselineRouteContractTests {

    private static final String BASELINE_RESOURCE = "api-baseline-77.csv";
    private static final Route PRODUCT_CREATE =
            new Route("POST", "/api/v1/admin/products");
    private static final Route PRODUCT_IMAGE_UPLOAD =
            new Route("POST", "/api/v1/admin/products/{productId}/images");
    private static final Set<Route> APPROVED_REFINEMENT_ROUTES = Set.of(
            new Route("GET", "/api/v1/admin/reports/sales-trend"),
            new Route("GET", "/api/v1/admin/reports/orders-trend"),
            new Route("GET", "/api/v1/admin/reports/product-performance"),
            PRODUCT_IMAGE_UPLOAD,
            new Route(
                    "DELETE",
                    "/api/v1/admin/products/{productId}/images/{imageId}"
            ),
            new Route(
                    "PATCH",
                    "/api/v1/admin/products/{productId}/images"
            ),
            new Route("GET", "/api/v1/admin/vouchers"),
            new Route("POST", "/api/v1/admin/vouchers"),
            new Route("GET", "/api/v1/admin/vouchers/{id}"),
            new Route("PUT", "/api/v1/admin/vouchers/{id}")
    );

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    RequestMappingHandlerMapping mappings;

    @Test
    void registeredApiRoutesMatchBaselineAndApprovedRefinements()
            throws Exception {
        Set<Route> baseline = baselineRoutes();
        Set<Route> expected = Stream.concat(
                        baseline.stream(),
                        APPROVED_REFINEMENT_ROUTES.stream()
                )
                .collect(Collectors.toUnmodifiableSet());
        Map<Route, Long> registered = registeredApiRoutes();

        assertEquals(
                77,
                baseline.size(),
                "Analyst baseline must contain exactly 77 routes"
        );
        assertEquals(
                baseline.size() + APPROVED_REFINEMENT_ROUTES.size(),
                expected.size(),
                "Approved refinements must not duplicate baseline routes"
        );
        assertEquals(
                expected,
                registered.keySet(),
                () -> "Route drift. Missing="
                        + difference(expected, registered.keySet())
                        + "; unexpected="
                        + difference(registered.keySet(), expected)
        );
        assertEquals(
                Map.of(),
                registered.entrySet().stream()
                        .filter(entry -> entry.getValue() != 1L)
                        .collect(Collectors.toMap(
                                Map.Entry::getKey,
                                Map.Entry::getValue
                        )),
                "Every approved method/path must have exactly one handler"
        );

        assertEquals(
                Set.of(Set.of(MediaType.APPLICATION_JSON)),
                representations(PRODUCT_CREATE),
                "API #29 must expose only the JSON representation"
        );
        assertEquals(
                Set.of(Set.of(MediaType.MULTIPART_FORM_DATA)),
                representations(PRODUCT_IMAGE_UPLOAD),
                "Product image upload must expose only multipart/form-data"
        );
    }

    private Set<Route> baselineRoutes() throws Exception {
        var resource = new ClassPathResource(BASELINE_RESOURCE);

        try (var reader = new BufferedReader(
                new InputStreamReader(
                        resource.getInputStream(),
                        StandardCharsets.UTF_8
                )
        )) {
            return reader.lines()
                    .map(line -> line.replace("\uFEFF", ""))
                    .skip(1)
                    .filter(line -> !line.isBlank())
                    .map(this::parseRoute)
                    .collect(Collectors.toUnmodifiableSet());
        }
    }

    private Route parseRoute(String line) {
        String[] columns = line.split(",", 5);
        if (columns.length != 5) {
            throw new IllegalStateException(
                    "Malformed API baseline row: " + line
            );
        }

        return new Route(columns[1], columns[2]);
    }

    private Map<Route, Long> registeredApiRoutes() {
        return mappings.getHandlerMethods()
                .keySet()
                .stream()
                .flatMap(info ->
                        info.getMethodsCondition()
                                .getMethods()
                                .stream()
                                .flatMap(method ->
                                        info.getPatternValues()
                                                .stream()
                                                .map(path ->
                                                        new Route(
                                                                method.name(),
                                                                path
                                                        )
                                                )
                                )
                )
                .filter(route -> route.path().startsWith("/api/v1/"))
                .collect(Collectors.groupingBy(
                        Function.identity(),
                        Collectors.counting()
                ));
    }

    private Set<Set<MediaType>> representations(Route route) {
        return mappings.getHandlerMethods()
                .keySet()
                .stream()
                .filter(info ->
                        info.getMethodsCondition().getMethods().stream()
                                .anyMatch(method -> method.name().equals(route.method()))
                                && info.getPatternValues().contains(route.path())
                )
                .map(info -> Set.copyOf(
                        info.getConsumesCondition().getConsumableMediaTypes()
                ))
                .collect(Collectors.toUnmodifiableSet());
    }

    private Set<Route> difference(
            Set<Route> left,
            Set<Route> right
    ) {
        return left.stream()
                .filter(route -> !right.contains(route))
                .collect(Collectors.toUnmodifiableSet());
    }

    private record Route(String method, String path) {
    }
}
