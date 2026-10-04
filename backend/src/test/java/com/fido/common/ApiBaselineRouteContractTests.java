package com.fido.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    private static final Set<Route> APPROVED_REFINEMENT_ROUTES = Set.of(
            new Route(
                    "DELETE",
                    "/api/v1/admin/products/{productId}/images/{imageId}"
            ),
            new Route(
                    "PATCH",
                    "/api/v1/admin/products/{productId}/images"
            )
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

        assertTrue(
                registered.entrySet().stream().allMatch(entry ->
                        entry.getValue() == 1L
                                || (entry.getKey().equals(PRODUCT_CREATE)
                                && entry.getValue() == 2L)
                ),
                () -> "An approved method/path has an unapproved duplicate mapping: "
                        + registered.entrySet().stream()
                                .filter(entry -> entry.getValue() > 1L)
                                .toList()
        );

        assertEquals(
                Set.of(
                        Set.of(MediaType.APPLICATION_JSON),
                        Set.of(MediaType.MULTIPART_FORM_DATA)
                ),
                productCreateRepresentations(),
                "API #29 must expose exactly the approved JSON and multipart representations"
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

    private Set<Set<MediaType>> productCreateRepresentations() {
        return mappings.getHandlerMethods()
                .keySet()
                .stream()
                .filter(info ->
                        info.getMethodsCondition().getMethods().stream()
                                .anyMatch(method -> method.name().equals(PRODUCT_CREATE.method()))
                                && info.getPatternValues().contains(PRODUCT_CREATE.path())
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
