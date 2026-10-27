package com.fido.modules.order.repository;

import com.fido.modules.order.entity.ShippingInfo;

import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ShippingInfoRepository extends Repository<ShippingInfo, Long> {

    Optional<ShippingInfo> findById(Long id);

    List<ShippingInfo> findAllByOrderIdIn(Collection<Long> orderIds);

    ShippingInfo save(ShippingInfo entity);
}
