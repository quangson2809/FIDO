package com.fido.modules.product.repository;

import com.fido.modules.product.entity.AttributeOption;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttributeOptionRepository extends Repository<AttributeOption, Long> {
    Optional<AttributeOption> findByAttributeIdAndAttributeOptionId(Long attributeId, Long optionId);
    boolean existsByAttributeIdAndValue(Long attributeId, String value);
    boolean existsByAttributeIdAndAttributeOptionId(Long attributeId, Long optionId);
    List<AttributeOption> findAllByAttributeIdOrderBySortOrderAscAttributeOptionIdAsc(Long attributeId);
    List<AttributeOption> findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(
            Collection<Long> attributeIds);
    AttributeOption save(AttributeOption entity);
}
