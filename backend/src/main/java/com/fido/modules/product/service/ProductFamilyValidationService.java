package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository;
import com.fido.modules.product.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Validates the active, selectable SKU combinations; drafts can be prepared independently. */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class ProductFamilyValidationService {
    private final ProductRepository products;
    private final ProductAttributeValueRepository values;
    private final AttributeRepository attributes;
    private final EntityManager em;

    public ProductFamilyValidationService(ProductRepository products,
            ProductAttributeValueRepository values, AttributeRepository attributes, EntityManager em) {
        this.products = products;
        this.values = values;
        this.attributes = attributes;
        this.em = em;
    }

    /** Metadata readers precede family locks; metadata edits take the corresponding write locks. */
    public void beginProductWrite() {
        attributes.lockMetadataForRead();
    }

    /** Lock both family roots in ID order before the member being changed. */
    public Product lockProductForUpdate(Long productId, Long nextParentId) {
        Product observed = products.findById(productId).filter(p -> !p.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        Long oldParent = observed.getParentProductId();
        var roots = new TreeSet<Long>();
        roots.add(oldParent == null ? productId : oldParent);
        if (nextParentId != null) roots.add(nextParentId);
        for (Long id : roots) {
            Product root = products.findByIdForUpdate(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            em.refresh(root, LockModeType.PESSIMISTIC_WRITE);
        }
        Product product = products.findByIdForUpdate(productId).orElseThrow();
        em.refresh(product, LockModeType.PESSIMISTIC_WRITE);
        if (product.isDeleted() || !Objects.equals(oldParent, product.getParentProductId())) {
            throw conflict("PRODUCT_FAMILY_CHANGED_RETRY");
        }
        return product;
    }

    public void validateFamily(Long rootId) {
        em.flush();
        List<Product> members = products.findActiveFamilyForValidation(rootId);
        if (members.size() < 2) return;
        Set<Long> defining = new HashSet<>();
        attributes.findAllByOrderBySortOrderAscAttributeIdAsc().stream()
                .filter(a -> a.isVariantDefining()).forEach(a -> defining.add(a.getAttributeId()));
        Map<Long, Map<Long, Long>> signatures = new LinkedHashMap<>();
        members.forEach(m -> signatures.put(m.getProductId(), new TreeMap<>()));
        for (var value : values.findForFamilyValidation(members.stream().map(Product::getProductId).toList())) {
            if (defining.contains(value.getAttributeId())) {
                signatures.get(value.getProductId()).put(value.getAttributeId(), value.getOptionId());
            }
        }
        Set<Long> axes = new HashSet<>();
        signatures.values().forEach(s -> axes.addAll(s.keySet()));
        // Legacy families without defining metadata require explicit SKU selection in the UI.
        if (axes.isEmpty()) return;
        Set<Map<Long, Long>> seen = new HashSet<>();
        for (var member : signatures.entrySet()) {
            Map<Long, Long> signature = member.getValue();
            // The independently sellable root is an explicit choice, never a wildcard.
            if (member.getKey().equals(rootId) && signature.isEmpty()) continue;
            if (!signature.keySet().equals(axes)) throw conflict("PRODUCT_FAMILY_ATTRIBUTES_INCONSISTENT");
            if (!seen.add(signature)) throw conflict("PRODUCT_FAMILY_COMBINATION_DUPLICATE");
        }
    }

    public void validateAllActiveFamilies() {
        for (Long rootId : products.findActiveFamilyRootIds()) validateFamily(rootId);
    }

    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
