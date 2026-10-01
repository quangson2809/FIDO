package com.fido.modules.order.repository;

import com.fido.modules.order.entity.ShippingInfo;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface ShippingInfoRepository extends Repository<ShippingInfo, Long> {

    Optional<ShippingInfo> findById(Long id);

    ShippingInfo save(ShippingInfo entity);
}
