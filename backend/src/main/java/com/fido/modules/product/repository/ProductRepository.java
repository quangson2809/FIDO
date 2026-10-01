package com.fido.modules.product.repository;

import com.fido.modules.product.entity.Product;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface ProductRepository extends Repository<Product, Long>, JpaSpecificationExecutor<Product> {
    Optional<Product> findById(Long id);
    Product save(Product entity);
    List<Product> findAllByProductIdIn(Collection<Long> productIds);
    boolean existsByCategoryId(Long categoryId);
    boolean existsByBrandId(Long brandId);
    boolean existsBySizeSystemId(Long sizeSystemId);

    @Query("select distinct p.gender from Product p where p.gender is not null and trim(p.gender) <> '' order by p.gender")
    List<String> findDistinctGenders();

    @Query("select distinct p.season from Product p where p.season is not null and trim(p.season) <> '' order by p.season")
    List<String> findDistinctSeasons();

    @Query("select distinct p.style from Product p where p.style is not null and trim(p.style) <> '' order by p.style")
    List<String> findDistinctStyles();
}
