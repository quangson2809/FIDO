package com.fido.common.response;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiResponseJsonContractTests {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void serializesObjectEnvelopeWithDataKey() throws Exception {
        assertEquals(
                "{\"data\":\"value\"}",
                jsonMapper.writeValueAsString(ApiResponse.of("value")));
    }

    @Test
    void serializesListEnvelopeWithAnalystPaginationKeys() throws Exception {
        ApiListResponse<String> response = ApiListResponse.of(
                List.of("first"),
                new PaginationMeta(1, 20, 21, 2));

        assertEquals(
                "{\"data\":[\"first\"],\"meta\":{\"page\":1,\"page_size\":20,\"total\":21,\"total_pages\":2}}",
                jsonMapper.writeValueAsString(response));
    }
}
