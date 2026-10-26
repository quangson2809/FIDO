package com.fido.modules.product.dto.request;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.JsonDeserializer;
import tools.jackson.databind.JsonMappingException;

/** Accept only JSON integer tokens for VND monetary fields; do not truncate decimals. */
public final class IntegerVndDeserializer extends JsonDeserializer<Long> {
    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) throws tools.jackson.core.JacksonException {
        if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) {
            throw JsonMappingException.from(parser, "VND price must be an integer number of đồng");
        }
        return parser.getLongValue();
    }
}
