package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.product.dto.request.ProductImageInput;
import com.fido.modules.product.dto.request.ProductImageReorderRequest;
import com.fido.modules.product.dto.response.AdminProductDetailDto;
import com.fido.modules.product.entity.Product;
import com.fido.modules.product.entity.ProductImage;
import com.fido.modules.product.repository.ProductImageRepository;

import jakarta.persistence.EntityManager;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@Transactional
public class ProductImageAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final ProductImageRepository images;
    private final CatalogReferenceService references;
    private final AdminCatalogQueryService query;
    private final AuditWriteService audit;
    private final EntityManager em;

    public ProductImageAdminService(
            ProductImageRepository images,
            CatalogReferenceService references,
            AdminCatalogQueryService query,
            AuditWriteService audit,
            EntityManager em) {
        this.images = images;
        this.references = references;
        this.query = query;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto appendUploadedImages(
            Long actor, Long productId, List<ImageStorageGateway.UploadedImage> uploaded) {
        Product product = references.productForUpdate(productId);
        List<ProductImage> current = images.findAllByProductIdForUpdate(productId);
        assertGalleryInvariant(current);

        int nextSortOrder = current.size();
        for (ImageStorageGateway.UploadedImage stored : uploaded) {
            if (stored == null || !ProductImageUrlPolicy.isValid(stored.url())) {
                throw new ProductImageStorageException(
                        HttpStatus.BAD_GATEWAY, "Image storage returned an invalid HTTPS URL");
            }

            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(stored.url());
            image.setSortOrder(nextSortOrder);
            image.setIsPrimary(nextSortOrder == 0);
            nextSortOrder++;
            images.save(image);
        }

        if (!uploaded.isEmpty()) product.touch();
        images.flush();
        recordProductUpdate(actor, productId);
        return query.detailInternal(productId);
    }

    @PreAuthorize(WRITE)
    public void removeImage(Long actor, Long productId, Long imageId) {
        Product product = references.productForUpdate(productId);
        List<ProductImage> current = images.findAllByProductIdForUpdate(productId);
        assertGalleryInvariant(current);

        ProductImage removed =
                current.stream()
                        .filter(image -> Objects.equals(image.getImageId(), imageId))
                        .findFirst()
                        .orElseThrow(ProductImageAdminService::notFound);

        images.delete(removed);
        images.flush();

        List<ProductImage> remaining =
                current.stream()
                        .filter(image -> !Objects.equals(image.getImageId(), imageId))
                        .toList();

        product.touch();
        normalizeSortOrder(remaining);
        recordProductUpdate(actor, productId);
    }

    @PreAuthorize(WRITE)
    public AdminProductDetailDto reorderImages(
            Long actor, Long productId, ProductImageReorderRequest request) {
        Product product = references.productForUpdate(productId);
        List<ProductImage> current = images.findAllByProductIdForUpdate(productId);
        assertGalleryInvariant(current);

        Map<Long, Integer> requestedOrders = validateRequestedOrders(current, request.images());
        List<ProductImage> finalOrder = resolveFinalOrder(current, requestedOrders);

        boolean changed =
                java.util.stream.IntStream.range(0, finalOrder.size())
                        .anyMatch(
                                index ->
                                        !Objects.equals(
                                                finalOrder.get(index).getSortOrder(), index));
        if (changed) product.touch();
        normalizeSortOrder(finalOrder);
        recordProductUpdate(actor, productId);

        return query.detailInternal(productId);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    void replaceImages(Product product, List<ProductImageInput> requested) {
        Long productId = product.getProductId();
        var sortOrders = new HashSet<Integer>();
        for (ProductImageInput item : requested) {
            if (!ProductImageUrlPolicy.isValid(item.image_url())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST, "Image URL must be a valid HTTPS URI");
            }
            Integer sortOrder = item.sort_order();
            if (sortOrder == null || sortOrder < 0 || !sortOrders.add(sortOrder)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Image sort order must be unique and non-negative");
            }
        }
        for (int expected = 0; expected < requested.size(); expected++) {
            if (!sortOrders.contains(expected)) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Image sort order must be contiguous");
            }
        }
        List<ProductImage> current =
                images.findAllByProductIdOrderBySortOrderAscImageIdAsc(productId);
        List<ProductImageInput> ordered =
                requested.stream()
                        .sorted(java.util.Comparator.comparing(ProductImageInput::sort_order))
                        .toList();
        boolean unchanged =
                current.size() == ordered.size()
                        && java.util.stream.IntStream.range(0, current.size())
                                .allMatch(
                                        index ->
                                                Objects.equals(
                                                                current.get(index).getSortOrder(),
                                                                ordered.get(index).sort_order())
                                                        && Objects.equals(
                                                                current.get(index).getImageUrl(),
                                                                ordered.get(index).image_url())
                                                        && Objects.equals(
                                                                current.get(index).getIsPrimary(),
                                                                index == 0));
        if (unchanged) return;
        product.touch();
        images.deleteAllByProductId(productId);
        em.flush();
        for (ProductImageInput item : requested) {
            ProductImage image = new ProductImage();
            image.setProductId(productId);
            image.setImageUrl(item.image_url());
            image.setSortOrder(item.sort_order());
            image.setIsPrimary(item.sort_order() == 0);
            images.save(image);
        }
    }

    private void assertGalleryInvariant(List<ProductImage> orderedImages) {
        for (int index = 0; index < orderedImages.size(); index++) {
            ProductImage image = orderedImages.get(index);
            if (!Objects.equals(image.getSortOrder(), index)
                    || !Objects.equals(image.getIsPrimary(), index == 0)) {
                // Existing-data repair is intentionally not implicit in a gallery command.
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT, "Product image gallery requires an approved repair");
            }
        }
    }

    private Map<Long, Integer> validateRequestedOrders(
            List<ProductImage> current, List<ProductImageReorderRequest.ImageOrder> requested) {
        Set<Long> currentIds =
                current.stream()
                        .map(ProductImage::getImageId)
                        .collect(java.util.stream.Collectors.toSet());

        Map<Long, Integer> orders = new HashMap<>();
        Set<Integer> requestedSortOrders = new HashSet<>();

        for (ProductImageReorderRequest.ImageOrder item : requested) {
            if (!currentIds.contains(item.image_id())) {
                throw notFound();
            }

            if (orders.putIfAbsent(item.image_id(), item.sort_order()) != null
                    || !requestedSortOrders.add(item.sort_order())) {
                conflict();
            }
        }

        return orders;
    }

    private List<ProductImage> resolveFinalOrder(
            List<ProductImage> current, Map<Long, Integer> requestedOrders) {
        Set<Integer> finalSortOrders = new HashSet<>();

        for (ProductImage image : current) {
            int sortOrder = requestedOrders.getOrDefault(image.getImageId(), image.getSortOrder());
            if (!finalSortOrders.add(sortOrder)) {
                conflict();
            }
        }

        for (int expected = 0; expected < current.size(); expected++) {
            if (!finalSortOrders.contains(expected)) {
                conflict();
            }
        }

        return current.stream()
                .sorted(
                        Comparator.comparingInt(
                                image ->
                                        requestedOrders.getOrDefault(
                                                image.getImageId(), image.getSortOrder())))
                .toList();
    }

    private void normalizeSortOrder(List<ProductImage> orderedImages) {
        boolean alreadyNormalized = true;
        for (int index = 0; index < orderedImages.size(); index++) {
            if (!Objects.equals(orderedImages.get(index).getSortOrder(), index)) {
                alreadyNormalized = false;
                break;
            }
        }

        if (alreadyNormalized) {
            boolean primaryChanged = false;
            for (int index = 0; index < orderedImages.size(); index++) {
                ProductImage image = orderedImages.get(index);
                boolean primary = index == 0;
                if (!Objects.equals(image.getIsPrimary(), primary)) {
                    image.setIsPrimary(primary);
                    primaryChanged = true;
                }
            }
            if (primaryChanged) {
                images.flush();
            }
            return;
        }

        long maxSortOrder =
                orderedImages.stream()
                        .map(ProductImage::getSortOrder)
                        .filter(Objects::nonNull)
                        .mapToLong(Integer::longValue)
                        .max()
                        .orElse(-1L);
        long temporaryBase = maxSortOrder + 1L;
        if (!orderedImages.isEmpty()
                && temporaryBase + orderedImages.size() - 1L > Integer.MAX_VALUE) {
            conflict();
        }

        // Vacate unique positions first, then persist the dense final permutation.
        for (int index = 0; index < orderedImages.size(); index++) {
            ProductImage image = orderedImages.get(index);
            image.setSortOrder((int) (temporaryBase + index));
            image.setIsPrimary(false);
        }
        images.flush();

        for (int index = 0; index < orderedImages.size(); index++) {
            ProductImage image = orderedImages.get(index);
            image.setSortOrder(index);
            image.setIsPrimary(index == 0);
        }
        images.flush();
    }

    private void recordProductUpdate(Long actor, Long productId) {
        audit.record(
                AuditWriteEvent.of(
                        AuditAction.PRODUCT_UPDATE, AuditEntityType.PRODUCT, productId.toString()));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND);
    }

    private static void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }
}
