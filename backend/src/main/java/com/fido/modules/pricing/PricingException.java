package com.fido.modules.pricing;

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
