package com.fido.modules.product.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.service.CatalogProductFilter;
import com.fido.modules.product.service.PublicCatalogQueryService;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/catalog")
public class PublicCatalogController {

    private final PublicCatalogQueryService service;

    public PublicCatalogController(PublicCatalogQueryService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public ApiListResponse<ProductSummaryDto> products(
            @RequestParam(required = false) String q,
            @RequestParam(name = "category_id", required = false) Long categoryId,
            @RequestParam(name = "brand_id", required = false) Long brandId,
            @RequestParam(name = "min_price", required = false) BigDecimal minPrice,
            @RequestParam(name = "max_price", required = false) BigDecimal maxPrice,
            @RequestParam(name = "size_value_id", required = false) Long sizeValueId,
            @RequestParam(name = "color_id", required = false) Long colorId,
            @RequestParam(required = false) String gender,
            @RequestParam(required = false) String season,
            @RequestParam(required = false) String style,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize
    ) {
        return service.publicProducts(
                new CatalogProductFilter(
                        q,
                        categoryId,
                        brandId,
                        minPrice,
                        maxPrice,
                        sizeValueId,
                        colorId,
                        gender,
                        season,
                        style,
                        page,
                        pageSize
                )
        );
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<ProductDetailDto> product(
            @PathVariable Long productId
    ) {
        return ApiResponse.of(
                service.publicDetail(productId)
        );
    }

    @GetMapping("/meta")
    public ApiResponse<CatalogMetaDto> meta() {
        return ApiResponse.of(
                service.publicMeta()
        );
    }
}
