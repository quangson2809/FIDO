package com.fido.modules.promotion.entity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
@Entity @Table(name = "voucher_usages") @Getter @Setter
public class VoucherUsage {
    @Id @Column(name = "order_id", nullable = false) private Long orderId;
    @Column(name = "voucher_id", nullable = false) private Long voucherId;
    @Column(name = "account_id", nullable = false) private Long accountId;
    @Column(name = "restored", nullable = false) private boolean restored;
}
