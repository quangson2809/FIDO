package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Category;
import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.Repository;

public interface CategoryRepository extends Repository<Category, Long> {
    Optional<Category> findById(Long id);
    Category save(Category entity);
    List<Category> findAllByOrderByCategoryIdAsc();
    boolean existsByParentCategoryId(Long parentCategoryId);
    void delete(Category entity);
}
