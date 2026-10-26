package com.fido.modules.product.dto.request;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** Accept only JSON integer tokens for VND monetary fields; do not truncate decimals. */
public final class IntegerVndDeserializer extends ValueDeserializer<Long> {
    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) throws JacksonException {
        if (parser.currentToken() != JsonToken.VALUE_NUMBER_INT) {
            return (Long) context.handleUnexpectedToken(
                    Long.class,
                    parser.currentToken(),
                    parser,
                    "VND price must be an integer number of đồng");
        }
        return parser.getLongValue();
    }
}
