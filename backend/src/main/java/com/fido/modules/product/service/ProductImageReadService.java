package com.fido.modules.product.service;

import com.fido.modules.product.repository.ProductImageRepository;
import com.fido.modules.product.repository.ProductRepresentativeImageView;
import java.util.Collection;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProductImageReadService {

    private final ProductImageRepository images;

    public ProductImageReadService(ProductImageRepository images) {
        this.images = images;
    }

    public Map<Long, String> representativeByProductIds(
            Collection<Long> productIds
    ) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }

        var distinctIds = productIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (distinctIds.isEmpty()) {
            return Map.of();
        }

        return images.findRepresentativeImagesByProductIdIn(distinctIds)
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        ProductRepresentativeImageView::getProductId,
                        ProductRepresentativeImageView::getImageUrl,
                        (first, ignored) -> first
                ));
    }
}
