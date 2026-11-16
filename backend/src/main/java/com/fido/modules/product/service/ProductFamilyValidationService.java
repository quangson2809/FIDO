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

/** Kiểm tra tổ hợp của các Product ACTIVE trong cùng family; bản nháp có thể chuẩn bị riêng. */
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

    /** Khóa đọc metadata trước khóa family; thao tác sửa metadata lấy khóa ghi tương ứng. */
    public void beginProductWrite() {
        attributes.lockMetadataForRead();
    }

    /** Khóa gốc family cũ/mới theo ID tăng dần trước Product đang sửa để thống nhất thứ tự khóa. */
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

    /**
     * rootId là Product gốc đã khóa; chỉ kiểm tra các thành viên ACTIVE.
     * COLOR và mã bắt đầu SIZE là trục chọn: mọi thành viên phải có cùng trục và tổ hợp Option duy
     * nhất.
     */
    public void validateFamily(Long rootId) {
        // Đẩy thay đổi đang chờ xuống DB để truy vấn kiểm tra family thấy cả dữ liệu vừa sửa trong giao dịch.
        em.flush();
        List<Product> members = products.findActiveFamilyForValidation(rootId);
        if (members.size() < 2) return;
        Set<Long> selectionAttributes = new HashSet<>();
        attributes.findAllByOrderBySortOrderAscAttributeIdAsc().stream()
                .filter(a -> "COLOR".equals(a.getCode()) || a.getCode().startsWith("SIZE"))
                .forEach(a -> selectionAttributes.add(a.getAttributeId()));
        Map<Long, Map<Long, Long>> signatures = new LinkedHashMap<>();
        members.forEach(m -> signatures.put(m.getProductId(), new TreeMap<>()));
        for (var value : values.findForFamilyValidation(members.stream().map(Product::getProductId).toList())) {
            if (selectionAttributes.contains(value.getAttributeId())) {
                signatures.get(value.getProductId()).put(value.getAttributeId(), value.getOptionId());
            }
        }
        // Lấy hợp các trục xuất hiện trong family rồi buộc mỗi thành viên có đủ đúng tập trục đó.
        Set<Long> axes = new HashSet<>();
        signatures.values().forEach(s -> axes.addAll(s.keySet()));
        if (axes.isEmpty()) throw conflict("PRODUCT_FAMILY_SELECTION_ATTRIBUTES_MISSING");
        Set<Map<Long, Long>> seen = new HashSet<>();
        for (var member : signatures.entrySet()) {
            Map<Long, Long> signature = member.getValue();
            if (!signature.keySet().equals(axes)) throw conflict("PRODUCT_FAMILY_ATTRIBUTES_INCONSISTENT");
            if (!seen.add(signature)) throw conflict("PRODUCT_FAMILY_COMBINATION_DUPLICATE");
        }
    }

    private static ResponseStatusException conflict(String code) {
        return new ResponseStatusException(HttpStatus.CONFLICT, code);
    }
}
