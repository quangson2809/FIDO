package com.fido.modules.order.service;

import com.fido.modules.account.service.AccountMutationLockService;
import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.cart.service.CartCommandService;
import com.fido.modules.cart.service.CheckoutCartView;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.OrderAddress;
import com.fido.modules.order.entity.OrderItem;
import com.fido.modules.order.entity.OrderVoucherSnapshot;
import com.fido.modules.order.entity.Payment;
import com.fido.modules.order.entity.ShippingInfo;
import com.fido.modules.order.mapper.OrderMapper;
import com.fido.modules.order.repository.OrderAddressRepository;
import com.fido.modules.order.repository.OrderItemRepository;
import com.fido.modules.order.repository.OrderRepository;
import com.fido.modules.order.repository.OrderVoucherSnapshotRepository;
import com.fido.modules.order.repository.PaymentRepository;
import com.fido.modules.order.repository.ShippingInfoRepository;
import com.fido.modules.product.service.OrderProductSnapshotService;
import com.fido.modules.promotion.service.VoucherRedemptionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional
public class OrderCreationService {
    private static final Pattern IDEMPOTENCY_KEY_PATTERN =
            Pattern.compile("[A-Za-z0-9._~-]{1,128}");

    private final CheckoutCalculationService checkout;
    private final CartCommandService cart;
    private final AccountMutationLockService accountLocks;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderAddressRepository addresses;
    private final OrderVoucherSnapshotRepository voucherSnapshots;
    private final PaymentRepository payments;
    private final ShippingInfoRepository shippingInfos;
    private final AuditWriteService audit;
    private final VoucherRedemptionService vouchers;
    private final CheckoutRequestNormalizer normalizer;
    private final OrderProductSnapshotService productSnapshots;

    @Autowired
    public OrderCreationService(
            CheckoutCalculationService checkout,
            CartCommandService cart,
            AccountMutationLockService accountLocks,
            OrderRepository orders,
            OrderItemRepository items,
            OrderAddressRepository addresses,
            OrderVoucherSnapshotRepository voucherSnapshots,
            PaymentRepository payments,
            ShippingInfoRepository shippingInfos,
            AuditWriteService audit,
            VoucherRedemptionService vouchers,
            CheckoutRequestNormalizer normalizer,
            OrderProductSnapshotService productSnapshots) {
        this.checkout = checkout;
        this.cart = cart;
        this.accountLocks = accountLocks;
        this.orders = orders;
        this.items = items;
        this.addresses = addresses;
        this.voucherSnapshots = voucherSnapshots;
        this.payments = payments;
        this.shippingInfos = shippingInfos;
        this.audit = audit;
        this.vouchers = vouchers;
        this.normalizer = normalizer;
        this.productSnapshots = productSnapshots;
    }

    public OrderCreationResult createWithIdempotencyKey(
            Long accountId, CreateOrderRequest request, List<String> headerValues) {
        String clientKey = requireIdempotencyKey(headerValues);
        CheckoutRequestNormalizer.Normalized normalized = normalizer.normalize(
                request.recipient_name(),
                request.recipient_phone(),
                request.province(),
                request.district(),
                request.ward(),
                request.address_line(),
                request.voucher_code());
        String fingerprint = normalizer.fingerprint(normalized);
        String storedKey = accountId + ":" + sha256(clientKey);

        // Serialize Account commands before durable-key lookup; replay must not inspect the Cart.
        accountLocks.lock(accountId);
        var existing = orders.findByIdempotencyKeyAndCustomerAccountId(storedKey, accountId);
        if (existing.isPresent()) {
            return replay(existing.get(), fingerprint);
        }

        // Hold Account and current Cart locks for the whole atomic Order write set.
        cart.lockForCheckout(accountId);
        CheckoutCalculation calculation =
                checkout.calculateForOrder(accountId, normalized.voucherCode());

        Map<Long, String> attributeSnapshots = productSnapshots.attributeSnapshots(
                calculation.items().stream()
                        .map(CheckoutCartView.Item::productId)
                        .collect(Collectors.toSet()));

        Order order = persistOrder(accountId, storedKey, fingerprint, calculation);
        persistOrderItems(order.getOrderId(), calculation, attributeSnapshots);
        OrderAddress address = persistAddress(order.getOrderId(), normalized);
        persistVoucherSnapshot(order.getOrderId(), calculation);
        Payment payment = persistInitialPayment(order.getOrderId(), calculation.total());
        persistInitialShipping(order.getOrderId(), normalized);
        vouchers.consume(order.getOrderId(), accountId, calculation.voucher());
        cart.completeForOrder(accountId);
        audit.record(AuditWriteEvent.of(
                AuditAction.ORDER_CREATE, AuditEntityType.ORDER, order.getOrderId().toString()));

        return new OrderCreationResult(
                OrderMapper.confirmation(order, payment, address), order.getOrderId(), false);
    }

    private OrderCreationResult replay(Order order, String fingerprint) {
        if (!fingerprint.equals(order.getRequestFingerprint())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "IDEMPOTENCY_PAYLOAD_MISMATCH");
        }
        Long orderId = order.getOrderId();
        Payment payment = payments.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("ORDER_PAYMENT_SNAPSHOT_MISSING"));
        OrderAddress address = addresses.findById(orderId)
                .orElseThrow(() -> new IllegalStateException("ORDER_ADDRESS_SNAPSHOT_MISSING"));
        return new OrderCreationResult(
                OrderMapper.confirmation(order, payment, address), orderId, true);
    }

    private Order persistOrder(
            Long accountId, String storedKey, String fingerprint, CheckoutCalculation calculation) {
        Order order = new Order();
        order.setOrderCode(generateOrderCode());
        order.setCustomerAccountId(accountId);
        order.setIdempotencyKey(storedKey);
        order.setRequestFingerprint(fingerprint);
        order.setSubtotal(calculation.subtotal());
        order.setDiscountAmount(calculation.discount());
        order.setShippingFee(calculation.shippingFee());
        order.setTotalAmount(calculation.total());
        order.setCurrency("VND");
        order.setVoucherId(calculation.voucher().voucherId());
        order.setOrderStatus(OrderPolicy.PENDING);
        return orders.save(order);
    }

    private void persistOrderItems(
            Long orderId,
            CheckoutCalculation calculation,
            Map<Long, String> attributeSnapshots) {
        for (CheckoutCartView.Item cartItem : calculation.items()) {
            var priced = calculation.lineFor(cartItem.productId());
            OrderItem orderItem = new OrderItem();
            orderItem.setOrderId(orderId);
            orderItem.setProductId(cartItem.productId());
            orderItem.setProductNameSnapshot(
                    cartItem.productName() == null || cartItem.productName().isBlank()
                            ? cartItem.sku() : cartItem.productName());
            orderItem.setImageUrlSnapshot(cartItem.thumbnail() == null ? "" : cartItem.thumbnail());
            orderItem.setSkuSnapshot(cartItem.sku());
            orderItem.setUnitPrice(cartItem.unitPrice());
            orderItem.setQuantity(cartItem.quantity());
            orderItem.setAttributeSnapshot(attributeSnapshots.getOrDefault(cartItem.productId(), "[]"));
            orderItem.setDiscountAmount(priced.discountAmount());
            orderItem.setLineTotal(priced.lineTotal());
            items.save(orderItem);
        }
    }

    private OrderAddress persistAddress(
            Long orderId, CheckoutRequestNormalizer.Normalized request) {
        OrderAddress address = new OrderAddress();
        address.setOrderId(orderId);
        address.setRecipientName(request.recipientName());
        address.setRecipientPhone(request.recipientPhone());
        address.setProvince(request.province());
        address.setDistrict(request.district());
        address.setWard(request.ward());
        address.setAddressLine(request.addressLine());
        return addresses.save(address);
    }

    private void persistVoucherSnapshot(Long orderId, CheckoutCalculation calculation) {
        var discount = calculation.voucher();
        if (discount.voucherId() == null) {
            return;
        }
        if (discount.discountType() == null || discount.discountValue() == null) {
            throw new IllegalStateException("VOUCHER_SNAPSHOT_METADATA_MISSING");
        }
        OrderVoucherSnapshot snapshot = new OrderVoucherSnapshot();
        snapshot.setOrderId(orderId);
        snapshot.setVoucherCodeSnapshot(discount.code());
        snapshot.setDiscountTypeSnapshot(discount.discountType());
        snapshot.setDiscountValueSnapshot(discount.discountValue());
        snapshot.setDiscountAmountSnapshot(calculation.discount());
        voucherSnapshots.save(snapshot);
    }

    private Payment persistInitialPayment(Long orderId, long total) {
        Payment payment = new Payment();
        payment.setOrderId(orderId);
        payment.setMethod("COD");
        payment.setPaymentStatus(OrderPolicy.UNPAID);
        payment.setAmount(total);
        payment.setCurrency("VND");
        payment.setRefundAmount(0L);
        return payments.save(payment);
    }

    private void persistInitialShipping(
            Long orderId, CheckoutRequestNormalizer.Normalized request) {
        ShippingInfo shipping = new ShippingInfo();
        shipping.setOrderId(orderId);
        shipping.setRecipientName(request.recipientName());
        shipping.setRecipientPhone(request.recipientPhone());
        shipping.setShippingStatus("PENDING");
        shippingInfos.save(shipping);
    }

    private String requireIdempotencyKey(List<String> values) {
        if (values == null || values.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_KEY_REQUIRED");
        }
        if (values.size() != 1 || values.get(0) == null
                || !IDEMPOTENCY_KEY_PATTERN.matcher(values.get(0)).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_KEY_INVALID");
        }
        return values.get(0);
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private String generateOrderCode() {
        return "ORD-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT);
    }

    public record OrderCreationResult(
            OrderConfirmationDto body, Long orderId, boolean replayed) {}
}
