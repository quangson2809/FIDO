package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CatalogMetaService {

    private final CategoryRepository categories;
    private final BrandRepository brands;

    public CatalogMetaService(CategoryRepository categories, BrandRepository brands) {
        this.categories = categories;
        this.brands = brands;
    }

    public CatalogMetaDto meta() {
        var categoryDtos =
                categories.findAllByOrderByCategoryIdAsc().stream()
                        .map(CatalogMapper::category)
                        .toList();
        var brandDtos =
                brands.findAllByOrderByBrandIdAsc().stream()
                        .map(CatalogMapper::brand)
                        .toList();
        return new CatalogMetaDto(categoryDtos, brandDtos);
    }
}
