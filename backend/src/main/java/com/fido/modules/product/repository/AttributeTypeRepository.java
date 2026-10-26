package com.fido.modules.product.repository;

import com.fido.modules.product.entity.AttributeType;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

public interface AttributeTypeRepository extends Repository<AttributeType, Long> {
    Optional<AttributeType> findById(Long id);
    Optional<AttributeType> findByCode(String code);
    List<AttributeType> findAllByOrderByAttributeTypeIdAsc();
}
