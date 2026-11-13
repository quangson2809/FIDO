package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Attribute;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AttributeRepository extends Repository<Attribute, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_READ)
    @org.springframework.data.jpa.repository.Query("select a from Attribute a order by a.attributeId")
    List<Attribute> lockMetadataForRead();

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select a from Attribute a order by a.attributeId")
    List<Attribute> lockMetadataForUpdate();

    Optional<Attribute> findById(Long id);
    Optional<Attribute> findByCode(String code);
    List<Attribute> findAllByAttributeIdIn(Collection<Long> attributeIds);
    boolean existsByCode(String code);
    List<Attribute> findAllByOrderBySortOrderAscAttributeIdAsc();
    Attribute save(Attribute entity);
}
