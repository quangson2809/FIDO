package com.fido.modules.product.repository;

import com.fido.modules.product.entity.SizeValue;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface SizeValueRepository extends Repository<SizeValue, Long> {
    Optional<SizeValue> findById(Long id);
    SizeValue save(SizeValue entity);
    List<SizeValue> findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(Long sizeSystemId);
    List<SizeValue> findAllBySizeValueIdIn(Collection<Long> sizeValueIds);
    List<SizeValue> findAllByOrderBySizeSystemIdAscSortOrderAscSizeValueIdAsc();
    void delete(SizeValue entity);
}
