package com.fido.modules.product.service;

import com.fido.modules.product.entity.Product;
import com.fido.modules.product.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class InventoryProductAccessService {
    private final ProductRepository products;
    private final EntityManager entityManager;

    public InventoryProductAccessService(ProductRepository products, EntityManager entityManager) {
        this.products = products;
        this.entityManager = entityManager;
    }

    /** Module kho kiểm tra Product qua hợp đồng này, không nhận entity JPA của catalog. */
    public void requireTrackedProduct(Long productId) {
        Product product = products.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        rejectDeleted(product);
    }

    /** Giữ khóa Product đến khi giao dịch thay đổi kho của bên gọi kết thúc. */
    public void lockTrackedProduct(Long productId) {
        Product product = products.findByIdForUpdate(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        entityManager.refresh(product, LockModeType.PESSIMISTIC_WRITE);
        rejectDeleted(product);
    }

    private void rejectDeleted(Product product) {
        if (product.getDeletedAt() != null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
}
