package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.repository.ProductImageRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProductImageAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductImageRepository images;
    private final CatalogReferenceService references;
    private final AdminCatalogQueryService query;
    private final AuditService audit;

    public ProductImageAdminService(
            ProductImageRepository images,
            CatalogReferenceService references,
            AdminCatalogQueryService query,
            AuditService audit
    ) {
        this.images = images;
        this.references = references;
        this.query = query;
        this.audit = audit;
    }

    @PreAuthorize(WRITE)
    public void removeImage(
            Long actor,
            Long productId,
            Long imageId
    ) {
        references.product(productId);

        List<ProductImage> current =
                images.findAllByProductIdForUpdate(productId);

        ProductImage removed = current.stream()
                .filter(image -> Objects.equals(image.getImageId(), imageId))
                .findFirst()
                .orElseThrow(ProductImageAdminService::notFound);

        images.delete(removed);
        images.flush();

        List<ProductImage> remaining = current.stream()
                .filter(image -> !Objects.equals(image.getImageId(), imageId))
                .toList();

        normalizeSortOrder(remaining);
        recordProductUpdate(actor, productId);
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto reorderImages(
            Long actor,
            Long productId,
            ProductImageReorderRequest request
    ) {
        references.product(productId);

        List<ProductImage> current =
                images.findAllByProductIdForUpdate(productId);

        Map<Long, Integer> requestedOrders = requireCompleteOrder(
                current,
                request.images()
        );

        List<ProductImage> finalOrder = current.stream()
                .sorted(Comparator.comparingInt(image ->
                        requestedOrders.get(image.getImageId())
                ))
                .toList();

        normalizeSortOrder(finalOrder);
        recordProductUpdate(actor, productId);

        return query.detailInternal(productId);
    }

    private Map<Long, Integer> requireCompleteOrder(
            List<ProductImage> current,
            List<ProductImageReorderRequest.ImageOrder> requested
    ) {
        Set<Long> currentIds = current.stream()
                .map(ProductImage::getImageId)
                .collect(java.util.stream.Collectors.toSet());

        Map<Long, Integer> orders = new HashMap<>();
        Set<Integer> sortOrders = new HashSet<>();

        for (ProductImageReorderRequest.ImageOrder item : requested) {
            if (!currentIds.contains(item.image_id())) {
                throw notFound();
            }

            if (orders.putIfAbsent(item.image_id(), item.sort_order()) != null
                    || !sortOrders.add(item.sort_order())) {
                conflict();
            }
        }

        if (orders.size() != current.size()) {
            conflict();
        }

        for (int expected = 0; expected < current.size(); expected++) {
            if (!sortOrders.contains(expected)) {
                conflict();
            }
        }

        return orders;
    }

    private void normalizeSortOrder(List<ProductImage> orderedImages) {
        boolean alreadyNormalized = true;

        for (int index = 0; index < orderedImages.size(); index++) {
            if (!Objects.equals(
                    orderedImages.get(index).getSortOrder(),
                    index
            )) {
                alreadyNormalized = false;
                break;
            }
        }

        if (alreadyNormalized) {
            return;
        }

        int temporaryBase = orderedImages.stream()
                .map(ProductImage::getSortOrder)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1) + 1;

        for (int index = 0; index < orderedImages.size(); index++) {
            orderedImages.get(index).setSortOrder(temporaryBase + index);
        }
        images.flush();

        for (int index = 0; index < orderedImages.size(); index++) {
            orderedImages.get(index).setSortOrder(index);
        }
        images.flush();
    }

    private void recordProductUpdate(Long actor, Long productId) {
        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.PRODUCT_UPDATE,
                        AuditTargetType.PRODUCT,
                        productId
                )
        );
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private static void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }
}
