package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Category;

import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends Repository<Category, Long> {
    Optional<Category> findById(Long id);

    Category save(Category entity);

    List<Category> findAllByOrderByCategoryIdAsc();

    List<Category> findAllByCategoryIdIn(Collection<Long> categoryIds);

    boolean existsByParentCategoryId(Long parentCategoryId);

    void delete(Category entity);
}
