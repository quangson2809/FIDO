package com.fido.modules.product.dto.response;

import java.util.List;

public record AdminCatalogMetaDtoV2(
        List<AttributeDto> attributes,
        ImageUploadLimits image_upload,
        List<CategoryDto> categories,
        List<BrandDto> brands) {
    public record ImageUploadLimits(
            long max_file_bytes,
            long max_request_bytes,
            int max_files,
            List<String> content_types) {}
}
