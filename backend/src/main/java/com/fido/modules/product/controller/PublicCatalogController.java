package com.fido.modules.product.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.ProductDetailDto;
import com.fido.modules.product.dto.response.ProductSummaryDto;
import com.fido.modules.product.service.CatalogProductFilter;
import com.fido.modules.product.service.PublicCatalogQueryService;

import org.springframework.http.HttpStatus;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/v1/catalog")
public class PublicCatalogController {
    private static final Pattern OPTION_FILTER = Pattern.compile("attribute_filters\\[([^\\[\\]]+)\\]");

    private final PublicCatalogQueryService service;

    public PublicCatalogController(PublicCatalogQueryService service) {
        this.service = service;
    }

    @GetMapping("/products")
    public ApiListResponse<ProductSummaryDto> products(
            @RequestParam(required = false) String q,
            @RequestParam(name = "category_id", required = false) Long categoryId,
            @RequestParam(name = "brand_id", required = false) Long brandId,
            @RequestParam(name = "min_price", required = false) Long minPrice,
            @RequestParam(name = "max_price", required = false) Long maxPrice,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize,
            @RequestParam MultiValueMap<String, String> queryParams) {
        return service.publicProducts(
                new CatalogProductFilter(q, categoryId, brandId, minPrice, maxPrice, page, pageSize,
                        optionFilters(queryParams)));
    }

    private static Map<String, String> optionFilters(MultiValueMap<String, String> params) {
        Map<String, String> result = new LinkedHashMap<>();
        params.forEach((name, values) -> {
            if (!name.startsWith("attribute_")) return;
            var match = OPTION_FILTER.matcher(name);
            if (!match.matches() || values == null || values.size() != 1
                    || values.get(0) == null || values.get(0).isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Attribute filter");
            }
            result.put(match.group(1), values.get(0));
        });
        return result;
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<ProductDetailDto> product(@PathVariable Long productId) {
        return ApiResponse.of(service.publicDetail(productId));
    }

    @GetMapping("/meta")
    public ApiResponse<CatalogMetaDto> meta() {
        return ApiResponse.of(service.publicMeta());
    }
}
