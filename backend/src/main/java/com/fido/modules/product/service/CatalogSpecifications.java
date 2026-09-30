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
            CatalogProductFilter filter
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            predicates.add(
                    cb.equal(
                            root.get("saleStatus"),
                            CatalogPolicy.ON_SALE
                    )
            );

            if (filter.query() != null
                    && !filter.query().isBlank()) {
                predicates.add(
                        cb.like(
                                cb.lower(root.get("name")),
                                "%"
                                        + filter.query()
                                                .trim()
                                                .toLowerCase(Locale.ROOT)
                                        + "%"
                        )
                );
            }

            if (filter.categoryId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("categoryId"),
                                filter.categoryId()
                        )
                );
            }

            if (filter.brandId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("brandId"),
                                filter.brandId()
                        )
                );
            }

            if (filter.gender() != null
                    && !filter.gender().isBlank()) {
                predicates.add(
                        cb.equal(
                                root.get("gender"),
                                filter.gender()
                        )
                );
            }

            if (filter.season() != null
                    && !filter.season().isBlank()) {
                predicates.add(
                        cb.equal(
                                root.get("season"),
                                filter.season()
                        )
                );
            }

            if (filter.style() != null
                    && !filter.style().isBlank()) {
                predicates.add(
                        cb.equal(
                                root.get("style"),
                                filter.style()
                        )
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

            if (filter.sizeValueId() != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("sizeValueId"),
                                filter.sizeValueId()
                        )
                );
            }

            if (filter.colorId() != null) {
                variantPredicates.add(
                        cb.equal(
                                variant.get("colorId"),
                                filter.colorId()
                        )
                );
            }

            if (filter.minPrice() != null) {
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
                                                filter.minPrice()
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
                                                filter.minPrice()
                                        )
                                )
                        )
                );
            }

            if (filter.maxPrice() != null) {
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
                                                filter.maxPrice()
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
                                                filter.maxPrice()
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
