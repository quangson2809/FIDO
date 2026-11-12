package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum OrderAction {
    CONFIRM(OrderPolicy.CONFIRMED, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_CONFIRM),
    START_PREPARING(OrderPolicy.PREPARING, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_PREPARE),
    DISPATCH(OrderPolicy.SHIPPING, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_SHIP),
    MARK_DELIVERY_FAILED(
            OrderPolicy.DELIVERY_FAILED, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_DELIVERY_FAILED),
    RETRY_DELIVERY(OrderPolicy.SHIPPING, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_RETRY_DELIVERY),
    CANCEL(OrderPolicy.CANCELLED, OrderPolicy.ORDER_EDIT, AuditAction.ORDER_CANCEL);
    private final String targetStatus;
    private final String permission;
    private final AuditAction auditAction;

    OrderAction(String targetStatus, String permission, AuditAction auditAction) {
        this.targetStatus = targetStatus;
        this.permission = permission;
        this.auditAction = auditAction;
    }

    public String targetStatus() {
        return targetStatus;
    }

    public String permission() {
        return permission;
    }

    public AuditAction auditAction() {
        return auditAction;
    }

    public static OrderAction fromWire(String value) {
        if (value == null) return null;
        try {
            return valueOf(value);
        } catch (IllegalArgumentException invalid) {
            return null;
        }
    }

    public static OrderAction require(String value) {
        OrderAction action = fromWire(value);
        if (action == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ORDER_ACTION_INVALID");
        return action;
    }
}
