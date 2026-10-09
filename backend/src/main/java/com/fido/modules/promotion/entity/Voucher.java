package com.fido.modules.promotion.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "vouchers")
@Getter @Setter @NoArgsConstructor
public class Voucher {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "voucher_id", nullable = false) private Long voucherId;
    @Column(name = "code", nullable = false, length = 80) private String code;
    @Column(name = "discount_type") private String discountType;
    @Column(name = "discount_value", precision = 18, scale = 2) private BigDecimal discountValue;
    @Column(name = "maximum_discount", precision = 18, scale = 2) private BigDecimal maximumDiscount;
    @Column(name = "minimum_amount", precision = 18, scale = 2) private BigDecimal minimumAmount;
    @Column(name = "starts_at") private Instant startsAt;
    @Column(name = "ends_at") private Instant endsAt;
    @Column(name = "scope") private String scope;
    @Column(name = "global_limit") private Long globalLimit;
    @Column(name = "customer_limit") private Long customerLimit;
    @Column(name = "enabled", nullable = false) private boolean enabled;
    @ElementCollection
    @CollectionTable(name = "voucher_products", joinColumns = @JoinColumn(name = "voucher_id"))
    @Column(name = "product_id") private Set<Long> productIds = new HashSet<>();
    @ElementCollection
    @CollectionTable(name = "voucher_categories", joinColumns = @JoinColumn(name = "voucher_id"))
    @Column(name = "category_id") private Set<Long> categoryIds = new HashSet<>();
}
