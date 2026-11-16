package com.fido.config.web;

import java.util.UUID;
import java.util.regex.Pattern;

/** Giữ mã liên kết trong cùng luồng request/lệnh đồng bộ; kết thúc phạm vi phải khôi phục ngữ cảnh cha. */
public final class CorrelationIdContext {

    public static final String HEADER_NAME = "X-Correlation-ID";

    private static final Pattern SAFE_CORRELATION_ID = Pattern.compile("[A-Za-z0-9._:-]{1,120}");
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private CorrelationIdContext() {}

    public static Scope open(String candidate) {
        String previous = CURRENT.get();
        CURRENT.set(normalizeOrGenerate(candidate));
        return new Scope(previous);
    }

    /** Tạo mã liên kết cho lệnh hệ thống tin cậy chạy ngoài HTTP. */
    public static Scope openGenerated() {
        return open(null);
    }

    public static String current() {
        return CURRENT.get();
    }

    /** Xóa ngữ cảnh khi hạ tầng chủ động bỏ hoặc tái sử dụng luồng. */
    public static void clear() {
        CURRENT.remove();
    }

    public static String currentOrGenerate() {
        String current = CURRENT.get();
        return current == null ? UUID.randomUUID().toString() : current;
    }

    static String normalizeOrGenerate(String candidate) {
        if (candidate != null) {
            String normalized = candidate.trim();
            if (SAFE_CORRELATION_ID.matcher(normalized).matches()) {
                return normalized;
            }
        }
        return UUID.randomUUID().toString();
    }

    public static final class Scope implements AutoCloseable {
        private final String previous;
        private boolean closed;

        private Scope(String previous) {
            this.previous = previous;
        }

        @Override
        public void close() {
            if (closed) {
                return;
            }
            closed = true;
            if (previous == null) {
                CURRENT.remove();
            } else {
                CURRENT.set(previous);
            }
        }
    }
}
