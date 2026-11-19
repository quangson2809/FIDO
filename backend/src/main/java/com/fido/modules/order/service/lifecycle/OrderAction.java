package com.fido.modules.order.service.lifecycle;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.order.service.OrderPolicy;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public enum OrderAction {
    CONFIRM(OrderPolicy.CONFIRMED, AuditAction.ORDER_CONFIRM),
    START_PREPARING(OrderPolicy.PREPARING, AuditAction.ORDER_PREPARE),
    DISPATCH(OrderPolicy.SHIPPING, AuditAction.ORDER_SHIP),
    MARK_DELIVERY_FAILED(OrderPolicy.DELIVERY_FAILED, AuditAction.ORDER_DELIVERY_FAILED),
    RETRY_DELIVERY(OrderPolicy.SHIPPING, AuditAction.ORDER_RETRY_DELIVERY),
    CANCEL(OrderPolicy.CANCELLED, AuditAction.ORDER_CANCEL);
    private final String targetStatus;
    private final AuditAction auditAction;

    OrderAction(String targetStatus, AuditAction auditAction) {
        this.targetStatus = targetStatus;
        this.auditAction = auditAction;
    }

    public String targetStatus() {
        return targetStatus;
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
