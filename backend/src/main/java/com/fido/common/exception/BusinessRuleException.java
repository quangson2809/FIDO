package com.fido.common.exception;

/** A business rejection without an HTTP or persistence dependency. */
public final class BusinessRuleException extends RuntimeException {
    public enum Kind {
        INVALID_INPUT,
        CONFLICT
    }

    private final Kind kind;

    private BusinessRuleException(Kind kind, String code) {
        super(code);
        this.kind = kind;
    }

    public Kind kind() {
        return kind;
    }

    public static BusinessRuleException invalid(String code) {
        return new BusinessRuleException(Kind.INVALID_INPUT, code);
    }

    public static BusinessRuleException conflict(String code) {
        return new BusinessRuleException(Kind.CONFLICT, code);
    }
}
