package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Category;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface CategoryRepository extends Repository<Category, Long> {
    Optional<Category> findById(Long id);
    Category save(Category entity);
}
