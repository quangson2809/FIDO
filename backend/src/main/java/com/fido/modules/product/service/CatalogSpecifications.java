package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductVariant;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Subquery;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;

/**
 * Catalog query predicates kept outside orchestration services.
 */
public final class CatalogSpecifications {

    private CatalogSpecifications() {
    }

    public static Specification<Product> publicProducts(
            String q,
            Long categoryId,
            Long brandId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            Long sizeValueId,
            Long colorId,
            String gender,
            String season,
            String style
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            predicates.add(
                    cb.equal(
                            root.get("saleStatus"),
                            CatalogPolicy.ON_SALE
                    )
            );

            if (q != null && !q.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%" + q.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (categoryId != null) {
                predicates.add(
                        cb.equal(root.get("categoryId"), categoryId)
                );
            }

            if (brandId != null) {
                predicates.add(
                        cb.equal(root.get("brandId"), brandId)
                );
            }

            if (gender != null && !gender.isBlank()) {
                predicates.add(
                        cb.equal(root.get("gender"), gender)
                );
            }

            if (season != null && !season.isBlank()) {
                predicates.add(
                        cb.equal(root.get("season"), season)
                );
            }

            if (style != null && !style.isBlank()) {
                predicates.add(
                        cb.equal(root.get("style"), style)
                );
            }

            Subquery<Long> variantQuery =
                    query.subquery(Long.class);

            var variant = variantQuery.from(ProductVariant.class);
            var variantPredicates = new ArrayList<Predicate>();

            variantPredicates.add(
                    cb.equal(
                            variant.get("productId"),
                            root.get("productId")
                    )
            );

            variantPredicates.add(
                    cb.equal(
                            variant.get("saleStatus"),
                            CatalogPolicy.ON_SALE
                    )
            );

            if (sizeValueId != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("sizeValueId"),
                                sizeValueId
                        )
                );
            }

            if (colorId != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("colorId"),
                                colorId
                        )
                );
            }

            if (minPrice != null) {
                variantPredicates.add(
                        cb.or(
                                cb.and(
                                        cb.isNotNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.greaterThanOrEqualTo(
                                                variant.<BigDecimal>get(
                                                        "overridePrice"
                                                ),
                                                minPrice
                                        )
                                ),
                                cb.and(
                                        cb.isNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.greaterThanOrEqualTo(
                                                root.<BigDecimal>get(
                                                        "basePrice"
                                                ),
                                                minPrice
                                        )
                                )
                        )
                );
            }

            if (maxPrice != null) {
                variantPredicates.add(
                        cb.or(
                                cb.and(
                                        cb.isNotNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.lessThanOrEqualTo(
                                                variant.<BigDecimal>get(
                                                        "overridePrice"
                                                ),
                                                maxPrice
                                        )
                                ),
                                cb.and(
                                        cb.isNull(
                                                variant.get("overridePrice")
                                        ),
                                        cb.lessThanOrEqualTo(
                                                root.<BigDecimal>get(
                                                        "basePrice"
                                                ),
                                                maxPrice
                                        )
                                )
                        )
                );
            }

            variantQuery
                    .select(variant.<Long>get("variantId"))
                    .where(
                            variantPredicates.toArray(Predicate[]::new)
                    );

            predicates.add(
                    cb.exists(variantQuery)
            );

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    public static Specification<Product> adminProducts(
            String q,
            Long categoryId,
            Long brandId,
            Long sizeSystemId,
            String saleStatus
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (q != null && !q.isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%" + q.trim().toLowerCase(Locale.ROOT) + "%"
                        )
                );
            }

            if (categoryId != null) {
                predicates.add(
                        cb.equal(root.get("categoryId"), categoryId)
                );
            }

            if (brandId != null) {
                predicates.add(
                        cb.equal(root.get("brandId"), brandId)
                );
            }

            if (sizeSystemId != null) {
                predicates.add(
                        cb.equal(root.get("sizeSystemId"), sizeSystemId)
                );
            }

            if (saleStatus != null) {
                predicates.add(
                        cb.equal(root.get("saleStatus"), saleStatus)
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }
}
