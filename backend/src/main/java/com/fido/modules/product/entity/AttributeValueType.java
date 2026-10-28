package com.fido.modules.product.entity;

/** The only supported typed attribute value kinds in the target catalog model. */
public enum AttributeValueType {
    OPTION,
    TEXT,
    NUMBER,
    BOOLEAN;

    /** Fails closed if the controlled lookup row is not canonical. */
    public static AttributeValueType from(AttributeType type) {
        if (type == null
                || type.getCode() == null
                || type.getDataType() == null
                || !type.getCode().equals(type.getDataType())) {
            throw new IllegalStateException("Attribute type lookup is not canonical");
        }
        try {
            return AttributeValueType.valueOf(type.getDataType());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("Unsupported attribute type lookup value", exception);
        }
    }
}
