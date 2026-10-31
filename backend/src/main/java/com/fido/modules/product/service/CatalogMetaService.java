package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.mapper.AttributeMapper;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CatalogMetaService {
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;

    public CatalogMetaService(
            CategoryRepository categories, BrandRepository brands,
            AttributeRepository attributes, AttributeOptionRepository options) {
        this.categories = categories;
        this.brands = brands;
        this.attributes = attributes;
        this.options = options;
    }

    public CatalogMetaDto publicMeta() {
        List<CategoryDto> categoryDtos = categories.findAllByOrderByCategoryIdAsc().stream()
                .map(CatalogMapper::category).toList();
        List<BrandDto> brandDtos = brands.findAllByOrderByBrandIdAsc().stream()
                .map(CatalogMapper::brand).toList();
        return new CatalogMetaDto(categoryDtos, brandDtos, attributeMetadata());
    }

    public AdminCatalogMetaDtoV2 adminMeta() {
        return new AdminCatalogMetaDtoV2(attributeMetadata());
    }

    private List<AttributeDto> attributeMetadata() {
        List<Attribute> rows = attributes.findAllByOrderBySortOrderAscAttributeIdAsc();
        List<Long> ids = rows.stream().map(Attribute::getAttributeId).toList();
        List<AttributeOption> optionRows = ids.isEmpty() ? List.of()
                : options.findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(ids);
        Map<Long, List<AttributeOption>> byAttribute = optionRows.stream()
                .collect(Collectors.groupingBy(AttributeOption::getAttributeId, HashMap::new, Collectors.toList()));
        return rows.stream().map(a -> AttributeMapper.attribute(
                a, byAttribute.getOrDefault(a.getAttributeId(), List.of()))).toList();
    }
}
