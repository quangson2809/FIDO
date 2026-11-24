package com.fido.modules.product.service.query;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductAttributeValue;

import jakarta.persistence.criteria.Predicate;

import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Locale;
import java.util.Map;

/** Ghép điều kiện truy vấn Product theo bộ lọc; không tạo hoặc sửa dữ liệu catalog. */
public final class CatalogSpecifications {

    private CatalogSpecifications() {}

    public static Specification<Product> publicProducts(
            CatalogProductFilter filter, Collection<Long> categoryIds) {
        return publicProducts(filter, categoryIds, Map.of());
    }

    public static Specification<Product> publicProducts(
            CatalogProductFilter filter,
            Collection<Long> categoryIds,
            Map<Long, Long> optionIdsByAttribute) {
        return publicProducts(
                filter,
                categoryIds,
                optionIdsByAttribute,
                new CatalogReferenceService.Visibility(java.util.Set.of(), java.util.Set.of()));
    }

    public static Specification<Product> publicProducts(
            CatalogProductFilter filter,
            Collection<Long> categoryIds,
            Map<Long, Long> optionIdsByAttribute,
            CatalogReferenceService.Visibility visibility) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (!visibility.hiddenCategories().isEmpty())
                predicates.add(
                        cb.or(
                                cb.isNull(root.get("categoryId")),
                                cb.not(root.get("categoryId").in(visibility.hiddenCategories()))));
            if (!visibility.hiddenBrands().isEmpty())
                predicates.add(
                        cb.or(
                                cb.isNull(root.get("brandId")),
                                cb.not(root.get("brandId").in(visibility.hiddenBrands()))));
            predicates.add(cb.equal(root.get("status"), "ACTIVE"));
            // Danh sách công khai chỉ trả Product gốc; Product con chỉ tham gia kiểm tra bộ lọc và
            // dữ liệu chi tiết.
            predicates.add(cb.isNull(root.get("parentProductId")));
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
            if (!optionIdsByAttribute.isEmpty()
                    || filter.minPrice() != null
                    || filter.maxPrice() != null) {
                // EXISTS kiểm tra một SKU trong family thỏa đồng thời mọi Option; không ghép màu
                // của
                // con này với size của con khác.
                var familyMatch = query.subquery(Long.class);
                var sku = familyMatch.from(Product.class);
                var skuPredicates = new ArrayList<Predicate>();
                skuPredicates.add(
                        cb.or(
                                cb.equal(sku.get("productId"), root.get("productId")),
                                cb.equal(sku.get("parentProductId"), root.get("productId"))));
                if (!visibility.hiddenCategories().isEmpty())
                    skuPredicates.add(
                            cb.or(
                                    cb.isNull(sku.get("categoryId")),
                                    cb.not(
                                            sku.get("categoryId")
                                                    .in(visibility.hiddenCategories()))));
                if (!visibility.hiddenBrands().isEmpty())
                    skuPredicates.add(
                            cb.or(
                                    cb.isNull(sku.get("brandId")),
                                    cb.not(sku.get("brandId").in(visibility.hiddenBrands()))));
                skuPredicates.add(cb.equal(sku.get("status"), "ACTIVE"));
                skuPredicates.add(cb.isNull(sku.get("deletedAt")));
                if (filter.minPrice() != null)
                    skuPredicates.add(cb.ge(sku.get("sellingPrice"), filter.minPrice()));
                if (filter.maxPrice() != null)
                    skuPredicates.add(cb.le(sku.get("sellingPrice"), filter.maxPrice()));
                for (var selected : optionIdsByAttribute.entrySet()) {
                    var optionMatch = familyMatch.subquery(Long.class);
                    var value = optionMatch.from(ProductAttributeValue.class);
                    optionMatch.select(value.get("productId"));
                    optionMatch.where(
                            cb.equal(value.get("productId"), sku.get("productId")),
                            cb.equal(value.get("attributeId"), selected.getKey()),
                            cb.equal(value.get("optionId"), selected.getValue()));
                    skuPredicates.add(cb.exists(optionMatch));
                }
                familyMatch.select(sku.get("productId"));
                familyMatch.where(cb.and(skuPredicates.toArray(Predicate[]::new)));
                predicates.add(cb.exists(familyMatch));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    public static Specification<Product> matchingMembers(
            Collection<Long> rootIds,
            CatalogProductFilter filter,
            Map<Long, Long> selected,
            CatalogReferenceService.Visibility visibility) {
        return (root, query, cb) -> {
            var conditions = new ArrayList<Predicate>();
            conditions.add(
                    cb.or(
                            root.get("productId").in(rootIds),
                            root.get("parentProductId").in(rootIds)));
            conditions.add(cb.equal(root.get("status"), "ACTIVE"));
            conditions.add(cb.isNull(root.get("deletedAt")));
            if (!visibility.hiddenCategories().isEmpty())
                conditions.add(
                        cb.or(
                                cb.isNull(root.get("categoryId")),
                                cb.not(root.get("categoryId").in(visibility.hiddenCategories()))));
            if (!visibility.hiddenBrands().isEmpty())
                conditions.add(
                        cb.or(
                                cb.isNull(root.get("brandId")),
                                cb.not(root.get("brandId").in(visibility.hiddenBrands()))));
            if (filter.minPrice() != null)
                conditions.add(cb.ge(root.get("sellingPrice"), filter.minPrice()));
            if (filter.maxPrice() != null)
                conditions.add(cb.le(root.get("sellingPrice"), filter.maxPrice()));
            selected.forEach(
                    (attributeId, optionId) -> {
                        var sub = query.subquery(Long.class);
                        var value = sub.from(ProductAttributeValue.class);
                        sub.select(value.get("productId"))
                                .where(
                                        cb.equal(value.get("productId"), root.get("productId")),
                                        cb.equal(value.get("attributeId"), attributeId),
                                        cb.equal(value.get("optionId"), optionId));
                        conditions.add(cb.exists(sub));
                    });
            return cb.and(conditions.toArray(Predicate[]::new));
        };
    }

    public static Specification<Product> adminProducts(
            String q,
            Long categoryId,
            Long brandId,
            Long parentProductId,
            boolean rootOnly,
            String status) {
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
            if (rootOnly) predicates.add(cb.isNull(root.get("parentProductId")));
            if (parentProductId != null) {
                predicates.add(cb.equal(root.get("parentProductId"), parentProductId));
            }
            if (status != null) predicates.add(cb.equal(root.get("status"), status));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
