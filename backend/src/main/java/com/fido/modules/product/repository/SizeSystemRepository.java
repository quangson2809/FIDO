package com.fido.modules.product.repository;

import com.fido.modules.product.entity.SizeSystem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface SizeSystemRepository extends Repository<SizeSystem, Long> {
    Optional<SizeSystem> findById(Long id);
    SizeSystem save(SizeSystem entity);
    List<SizeSystem> findAllByOrderBySizeSystemIdAsc();
    void delete(SizeSystem entity);
}
