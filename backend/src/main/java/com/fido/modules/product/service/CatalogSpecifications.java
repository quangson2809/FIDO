package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Locale;

/** Catalog query predicates for canonical Product rows. */
public final class CatalogSpecifications {

    private CatalogSpecifications() {}

    public static Specification<Product> publicProducts(
            CatalogProductFilter filter, Collection<Long> categoryIds) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (filter.query() != null && !filter.query().isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%" + filter.query().trim().toLowerCase(Locale.ROOT) + "%"));
            }
            if (filter.categoryId() != null) {
                predicates.add(root.get("categoryId").in(categoryIds));
            }
            if (filter.brandId() != null) {
                predicates.add(cb.equal(root.get("brandId"), filter.brandId()));
            }
            if (filter.minPrice() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<Long>get("sellingPrice"), filter.minPrice()));
            }
            if (filter.maxPrice() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<Long>get("sellingPrice"), filter.maxPrice()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    public static Specification<Product> adminProducts(
            String q, Long categoryId, Long brandId, Long parentProductId, String status) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            predicates.add(cb.isNull(root.get("deletedAt")));

            if (q != null && !q.isBlank()) {
                String term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(
                        cb.or(
                                cb.like(cb.lower(root.get("name")), term),
                                cb.like(cb.lower(root.get("sku")), term)));
            }
            if (categoryId != null) predicates.add(cb.equal(root.get("categoryId"), categoryId));
            if (brandId != null) predicates.add(cb.equal(root.get("brandId"), brandId));
            if (parentProductId != null) {
                predicates.add(cb.equal(root.get("parentProductId"), parentProductId));
            }
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
