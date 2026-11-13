package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Product;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository
        extends Repository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findById(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select product from Product product where product.productId = :productId")
    Optional<Product> findByIdForUpdate(@Param("productId") Long productId);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select p from Product p where (p.productId = :rootId or p.parentProductId = :rootId) and p.deletedAt is null and p.status = 'ACTIVE' order by p.productId")
    List<Product> findActiveFamilyForValidation(@Param("rootId") Long rootId);

    Product save(Product entity);

    List<Product> findAllByProductIdIn(Collection<Long> productIds);

    List<Product> findAllByParentProductIdOrderByProductIdAsc(Long parentProductId);

    boolean existsBySku(String sku);

    boolean existsBySkuAndProductIdNot(String sku, Long productId);

    boolean existsByCategoryId(Long categoryId);

    boolean existsByBrandId(Long brandId);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select p from Product p where p.parentProductId = :parentId order by p.productId")
    List<Product> findChildrenForValidation(@Param("parentId") Long parentId);

    boolean existsByParentProductId(Long parentProductId);

    boolean existsByParentProductIdAndDeletedAtIsNull(Long parentProductId);
}
