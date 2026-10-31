package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Attribute;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttributeRepository extends Repository<Attribute, Long> {
    Optional<Attribute> findById(Long id);
    Optional<Attribute> findByCode(String code);
    List<Attribute> findAllByAttributeIdIn(Collection<Long> attributeIds);
    boolean existsByCode(String code);
    List<Attribute> findAllByOrderBySortOrderAscAttributeIdAsc();
    Attribute save(Attribute entity);
}
