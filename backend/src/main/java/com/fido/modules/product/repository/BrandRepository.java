package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Brand;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface BrandRepository extends Repository<Brand, Long> {
    Optional<Brand> findById(Long id);
    Brand save(Brand entity);
    List<Brand> findAllByOrderByBrandIdAsc();
    void delete(Brand entity);
}
