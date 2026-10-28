package com.fido.modules.pricing;

/** A deterministic domain failure raised by the pure pricing arithmetic core. */
public final class PricingException extends IllegalArgumentException {
    private final String code;

    public PricingException(String code) {
        super(code);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
