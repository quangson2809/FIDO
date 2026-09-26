package com.fido.modules.product.controller;

import com.fido.common.response.*;
import com.fido.modules.product.dto.response.*;
import com.fido.modules.product.service.CatalogQueryService;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog")
public class PublicCatalogController {
    private final CatalogQueryService service;
    public PublicCatalogController(CatalogQueryService service){this.service=service;}

    @GetMapping("/products")
    public ApiListResponse<ProductSummaryDto> products(@RequestParam(required=false) String q,
            @RequestParam(name="category_id",required=false) Long categoryId,
            @RequestParam(name="brand_id",required=false) Long brandId,
            @RequestParam(name="min_price",required=false) BigDecimal minPrice,
            @RequestParam(name="max_price",required=false) BigDecimal maxPrice,
            @RequestParam(name="size_value_id",required=false) Long sizeValueId,
            @RequestParam(name="color_id",required=false) Long colorId,
            @RequestParam(required=false) String gender,@RequestParam(required=false) String season,
            @RequestParam(required=false) String style,@RequestParam(required=false) Integer page,
            @RequestParam(name="page_size",required=false) Integer pageSize) {
        return service.publicProducts(q,categoryId,brandId,minPrice,maxPrice,sizeValueId,colorId,gender,season,style,page,pageSize);
    }

    @GetMapping("/products/{productId}")
    public ApiResponse<ProductDetailDto> product(@PathVariable Long productId){
        return ApiResponse.of(service.publicDetail(productId));
    }

    @GetMapping("/meta")
    public ApiResponse<CatalogMetaDto> meta(){return ApiResponse.of(service.publicMeta());}
}
