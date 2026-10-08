package com.fido.modules.product.service;

import java.net.URI;

final class ProductImageUrlPolicy {
    private ProductImageUrlPolicy() { }

    static boolean isValid(String value) {
        if (value == null || value.isBlank() || value.length() > 1000) {
            return false;
        }
        try {
            URI uri = URI.create(value);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getHost() != null
                    && uri.getRawUserInfo() == null && uri.getRawFragment() == null
                    && (uri.getPort() == -1 || uri.getPort() > 0 && uri.getPort() <= 65535);
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
