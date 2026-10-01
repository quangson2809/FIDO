package com.fido.modules.order.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.order.dto.request.AdminOrderPatchRequest;
import com.fido.modules.order.dto.request.RecipientPatchRequest;
import com.fido.modules.order.dto.response.OrderAdminDetailDto;
import com.fido.modules.order.dto.response.OrderCustomerDetailDto;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class OrderEditService {

    private static final String EDIT =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_ORDER_EDIT')";

    private final OrderRepository orders;
    private final ShippingInfoRepository shipping;
    private final OrderQueryService query;
    private final AuditService audit;

    public OrderEditService(
            OrderRepository orders,
            ShippingInfoRepository shipping,
            OrderQueryService query,
            AuditService audit
    ) {
        this.orders = orders;
        this.shipping = shipping;
        this.query = query;
        this.audit = audit;
    }

    public OrderCustomerDetailDto updateRecipient(
            Long accountId,
            Long orderId,
            RecipientPatchRequest request
    ) {
        Order order = locked(orderId);

        if (!Objects.equals(
                order.getCustomerAccountId(),
                accountId
        )) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }

        if (!request.isPhonePresent()
                && !request.isAddressPresent()) {
            return query.customerDetailInternal(order);
        }

        requireRecipientEditable(order);

        if (request.isPhonePresent()) {
            order.setRecipientPhone(
                    request.getRecipientPhone()
            );
        }

        if (request.isAddressPresent()) {
            order.setRecipientAddress(
                    request.getRecipientAddress()
            );
        }

        orders.save(order);

        audit.record(
                AuditEvent.of(
                        accountId,
                        AuditAction.ORDER_RECIPIENT_UPDATE,
                        AuditTargetType.ORDER,
                        orderId
                )
        );

        return query.customerDetailInternal(order);
    }

    @PreAuthorize(EDIT)
    public OrderAdminDetailDto updateAdmin(
            Long actor,
            Long orderId,
            AdminOrderPatchRequest request,
            Authentication authentication
    ) {
        Order order = locked(orderId);

        applyAdminRecipientPatch(
                order,
                request
        );

        applyCustomerServicePatch(
                order,
                request
        );

        orders.save(order);

        applyShippingPatch(
                orderId,
                request
        );

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.ORDER_ADMIN_UPDATE,
                        AuditTargetType.ORDER,
                        orderId
                )
        );

        return query.adminDetailInternal(order, authentication);
    }

    private void applyAdminRecipientPatch(
            Order order,
            AdminOrderPatchRequest request
    ) {
        boolean recipientChange =
                request.isPhonePresent()
                || request.isEmailPresent()
                || request.isAddressPresent();

        if (!recipientChange) {
            return;
        }

        requireRecipientEditable(order);

        if (request.isPhonePresent()) {
            order.setRecipientPhone(
                    request.getRecipientPhone()
            );
        }

        if (request.isEmailPresent()) {
            order.setRecipientEmail(
                    request.getRecipientEmail()
            );
        }

        if (request.isAddressPresent()) {
            order.setRecipientAddress(
                    request.getRecipientAddress()
            );
        }
    }

    private void applyCustomerServicePatch(
            Order order,
            AdminOrderPatchRequest request
    ) {
        if (!request.isNotePresent()) {
            return;
        }

        order.setCustomerServiceNote(
                request.getCustomerServiceNote()
        );
    }

    private void applyShippingPatch(
            Long orderId,
            AdminOrderPatchRequest request
    ) {
        if (!request.isShippingInfoPresent()) {
            return;
        }

        var input = request.getShippingInfo();

        ShippingInfo info = shipping
                .findById(orderId)
                .orElseGet(() -> {
                    ShippingInfo created = new ShippingInfo();
                    created.setOrderId(orderId);
                    return created;
                });

        info.setDeliveryMode(
                input.delivery_mode()
        );
        info.setCarrierName(
                input.carrier_name()
        );

        shipping.save(info);
    }

    private void requireRecipientEditable(Order order) {
        if (!OrderPolicy.recipientEditable(
                order.getOrderStatus()
        )) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
    }

    private Order locked(Long orderId) {
        return orders.findByIdForUpdate(orderId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }
}
