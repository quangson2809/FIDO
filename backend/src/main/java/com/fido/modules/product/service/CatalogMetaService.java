package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.entity.SizeSystem;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import com.fido.modules.product.repository.ColorRepository;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.SizeSystemRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CatalogMetaService {

    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ColorRepository colors;
    private final ProductRepository products;
    private final CatalogReferenceService references;

    public CatalogMetaService(
            CategoryRepository categories,
            BrandRepository brands,
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ColorRepository colors,
            ProductRepository products,
            CatalogReferenceService references
    ) {
        this.categories = categories;
        this.brands = brands;
        this.sizeSystems = sizeSystems;
        this.sizeValues = sizeValues;
        this.colors = colors;
        this.products = products;
        this.references = references;
    }

    public SizeSystemDto sizeSystemDto(Long sizeSystemId) {
        SizeSystem sizeSystem = references.sizeSystem(sizeSystemId);

        var values = sizeValues
                .findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                )
                .stream()
                .map(CatalogMapper::sizeValue)
                .toList();

        return CatalogMapper.sizeSystem(
                sizeSystem,
                values
        );
    }

    public CatalogMetaDto meta() {
        var categoryDtos = categories
                .findAllByOrderByCategoryIdAsc()
                .stream()
                .map(CatalogMapper::category)
                .toList();

        var brandDtos = brands
                .findAllByOrderByBrandIdAsc()
                .stream()
                .map(CatalogMapper::brand)
                .toList();

        var sizeSystemDtos = sizeSystems
                .findAllByOrderBySizeSystemIdAsc()
                .stream()
                .map(sizeSystem ->
                        sizeSystemDto(sizeSystem.getSizeSystemId())
                )
                .toList();

        var colorDtos = colors
                .findAllByOrderByColorIdAsc()
                .stream()
                .map(CatalogMapper::color)
                .toList();

        return new CatalogMetaDto(
                categoryDtos,
                brandDtos,
                sizeSystemDtos,
                colorDtos,
                products.findDistinctGenders(),
                products.findDistinctSeasons(),
                products.findDistinctStyles()
        );
    }
}
