package com.fido.config.web;

import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Request/command-scoped correlation context shared by synchronous service calls on the thread.
 * A scope must be opened and closed at the command boundary; nested scopes restore their parent.
 */
public final class CorrelationIdContext {

    public static final String HEADER_NAME = "X-Correlation-ID";

    private static final Pattern SAFE_CORRELATION_ID =
            Pattern.compile("[A-Za-z0-9._:-]{1,120}");
    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private CorrelationIdContext() {}

    public static Scope open(String candidate) {
        String previous = CURRENT.get();
        CURRENT.set(normalizeOrGenerate(candidate));
        return new Scope(previous);
    }

    /** Opens a generated command context for trusted non-HTTP/system work. */
    public static Scope openGenerated() {
        return open(null);
    }

    public static String current() {
        return CURRENT.get();
    }

    /** Removes context when a thread is explicitly abandoned or reset by infrastructure. */
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
