package com.fido.modules.order.repository;

import com.fido.modules.order.entity.ShippingInfo;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface ShippingInfoRepository extends Repository<ShippingInfo, Long> {
    Optional<ShippingInfo> findById(Long id);
    ShippingInfo save(ShippingInfo entity);
}
