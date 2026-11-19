package com.fido.common.exception;

import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/** Danh mục thông báo công khai dùng chung với giao diện; không đọc thông báo từ lỗi gốc. */
public final class PublicErrorMessages {
    private static final Map<String, String> MESSAGES = load();

    private PublicErrorMessages() {}

    public static boolean contains(String code) {
        return code != null && MESSAGES.containsKey(code);
    }

    public static String message(String code) {
        return MESSAGES.getOrDefault(code, MESSAGES.get("REQUEST_REJECTED"));
    }

    private static Map<String, String> load() {
        try (InputStream input =
                PublicErrorMessages.class.getResourceAsStream("/error-messages.vi.json")) {
            if (input == null) throw new IllegalStateException("Public error messages are missing");
            Map<String, String> messages = new LinkedHashMap<>();
            new ObjectMapper()
                    .readTree(input)
                    .properties()
                    .forEach(entry -> messages.put(entry.getKey(), entry.getValue().asText()));
            return Map.copyOf(messages);
        } catch (Exception failure) {
            throw new IllegalStateException("Cannot load public error messages", failure);
        }
    }
}
