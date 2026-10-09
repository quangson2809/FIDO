package com.fido.modules.product.service;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Catalog-owned promotion scope resolution; no catalog entities cross the boundary. */
@Service @Transactional(readOnly = true)
public class PromotionCatalogService {
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ProductVariantRepository variants;
    public PromotionCatalogService(ProductRepository products, CategoryRepository categories,
                                   ProductVariantRepository variants) {
        this.products=products; this.categories=categories; this.variants=variants;
    }
    public void validateTargets(Set<Long> productIds, Set<Long> categoryIds) {
        if (products.findAllByProductIdIn(productIds).size()!=productIds.size()
                || categories.findAllByCategoryIdIn(categoryIds).size()!=categoryIds.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sản phẩm hoặc danh mục không tồn tại");
        }
    }
    public Set<Long> eligibleVariants(Collection<Long> variantIds, String scope,
                                     Set<Long> productIds, Set<Long> categoryIds) {
        if ("ALL".equals(scope)) return Set.copyOf(variantIds);
        Set<Long> expanded = new HashSet<>(categoryIds);
        if ("CATEGORY".equals(scope)) {
            var tree = categories.findAllByOrderByCategoryIdAsc();
            boolean changed;
            do {
                changed=false;
                for (var category:tree) {
                    if (expanded.contains(category.getParentCategoryId()))
                        changed |= expanded.add(category.getCategoryId());
                }
            } while(changed);
        }
        var found=variants.findAllByVariantIdIn(variantIds);
        Set<Long> eligibleProducts = new HashSet<>(productIds);
        if ("CATEGORY".equals(scope)) {
            products.findAllByProductIdIn(found.stream().map(v->v.getProductId()).toList())
                    .stream().filter(p->expanded.contains(p.getCategoryId()))
                    .forEach(p->eligibleProducts.add(p.getProductId()));
        }
        Set<Long> result=new HashSet<>();
        found.stream().filter(v->eligibleProducts.contains(v.getProductId()))
                .forEach(v->result.add(v.getVariantId()));
        return Set.copyOf(result);
    }
}
