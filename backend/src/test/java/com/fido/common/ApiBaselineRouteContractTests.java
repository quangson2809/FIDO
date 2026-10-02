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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

@SpringBootTest
@ActiveProfiles("test")
class ApiBaselineRouteContractTests {

    private static final String BASELINE_RESOURCE = "api-baseline-77.csv";

    @Autowired
    RequestMappingHandlerMapping mappings;

    @Test
    void registeredApiRoutesMatchThe77EndpointBaseline() throws Exception {
        Set<Route> expected = baselineRoutes();
        Map<Route, Long> registered = registeredApiRoutes();

        assertEquals(77, expected.size(), "Baseline must contain exactly 77 routes");
        assertEquals(
                expected,
                registered.keySet(),
                () -> "Route drift. Missing="
                        + difference(expected, registered.keySet())
                        + "; unexpected="
                        + difference(registered.keySet(), expected)
        );
        assertTrue(
                registered.values().stream().allMatch(count -> count == 1L),
                () -> "A baseline method/path is registered more than once: "
                        + registered.entrySet().stream()
                                .filter(entry -> entry.getValue() > 1L)
                                .toList()
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
