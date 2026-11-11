package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Category;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.repository.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends Repository<Category, Long> {
    Optional<Category> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select category from Category category where category.categoryId = :categoryId")
    Optional<Category> findByIdForUpdate(@Param("categoryId") Long categoryId);
    Category save(Category entity);
    List<Category> findAllByOrderByCategoryIdAsc();
    List<Category> findAllByCategoryIdIn(Collection<Long> categoryIds);
    boolean existsByParentCategoryId(Long parentCategoryId);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndCategoryIdNot(String slug, Long categoryId);
    void delete(Category entity);
}
