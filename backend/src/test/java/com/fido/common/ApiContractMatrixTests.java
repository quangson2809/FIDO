package com.fido.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class ApiContractMatrixTests {

    private static final String BASELINE_RESOURCE = "api-baseline-77.csv";
    private static final String MATRIX_RESOURCE = "api-contract-matrix.csv";
    private static final Set<String> ALLOWED_CONTRACT_STATUSES = Set.of(
            "PASS",
            "PENDING",
            "DEFERRED_PARTIAL"
    );

    @Test
    void contractMatrixCoversExactlyTheCurrentApiBaseline() throws Exception {
        Map<Integer, BaselineRow> baseline = baselineRows();
        Map<Integer, MatrixRow> matrix = matrixRows();

        assertEquals(77, baseline.size(), "Baseline must contain exactly 77 APIs");
        assertEquals(77, matrix.size(), "Contract matrix must contain exactly 77 APIs");
        assertEquals(baseline.keySet(), matrix.keySet(), "Contract matrix API numbers drifted from baseline");

        for (var entry : baseline.entrySet()) {
            MatrixRow reviewed = matrix.get(entry.getKey());
            BaselineRow expected = entry.getValue();

            assertEquals(expected.method(), reviewed.method(), "Method drift for API #" + entry.getKey());
            assertEquals(expected.url(), reviewed.url(), "URL drift for API #" + entry.getKey());
            assertEquals(expected.ownerModule(), reviewed.ownerModule(), "Owner drift for API #" + entry.getKey());
            assertEquals(expected.access(), reviewed.access(), "Access drift for API #" + entry.getKey());
            assertEquals("PASS", reviewed.routeStatus(), "Registered route is not locked for API #" + entry.getKey());
            assertTrue(
                    ALLOWED_CONTRACT_STATUSES.contains(reviewed.contractStatus()),
                    "Unknown contract review status for API #" + entry.getKey()
            );

            if ("PASS".equals(reviewed.contractStatus())) {
                assertFalse(
                        reviewed.evidence().contains("pending_deep_contract_review"),
                        "PASS API must cite concrete review evidence: #" + entry.getKey()
                );
            }

            if ("DEFERRED_PARTIAL".equals(reviewed.contractStatus())) {
                assertFalse(
                        "none".equals(reviewed.deferredSlice()),
                        "Deferred API must name the unresolved slice: #" + entry.getKey()
                );
            }
        }
    }

    private Map<Integer, BaselineRow> baselineRows() throws Exception {
        List<String> lines = resourceLines(BASELINE_RESOURCE);

        return lines.stream()
                .map(line -> line.split(",", 5))
                .map(columns -> new BaselineRow(
                        Integer.parseInt(columns[0]),
                        columns[1],
                        columns[2],
                        columns[3],
                        columns[4]
                ))
                .collect(Collectors.toUnmodifiableMap(
                        BaselineRow::number,
                        Function.identity()
                ));
    }

    private Map<Integer, MatrixRow> matrixRows() throws Exception {
        List<String> lines = resourceLines(MATRIX_RESOURCE);

        return lines.stream()
                .map(line -> line.split(",", 9))
                .map(columns -> {
                    if (columns.length != 9) {
                        throw new IllegalStateException("Malformed contract matrix row: " + String.join(",", columns));
                    }

                    return new MatrixRow(
                            Integer.parseInt(columns[0]),
                            columns[1],
                            columns[2],
                            columns[3],
                            columns[4],
                            columns[5],
                            columns[6],
                            columns[7],
                            columns[8]
                    );
                })
                .collect(Collectors.toUnmodifiableMap(
                        MatrixRow::number,
                        Function.identity()
                ));
    }

    private List<String> resourceLines(String resourceName) throws Exception {
        var resource = new ClassPathResource(resourceName);

        try (var reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)
        )) {
            return reader.lines()
                    .map(line -> line.replace("\uFEFF", ""))
                    .skip(1)
                    .filter(line -> !line.isBlank())
                    .toList();
        }
    }

    private record BaselineRow(
            int number,
            String method,
            String url,
            String ownerModule,
            String access
    ) {
    }

    private record MatrixRow(
            int number,
            String method,
            String url,
            String ownerModule,
            String access,
            String routeStatus,
            String contractStatus,
            String deferredSlice,
            String evidence
    ) {
    }
}
