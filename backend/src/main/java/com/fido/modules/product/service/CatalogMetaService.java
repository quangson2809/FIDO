package com.fido.modules.product.service;

import com.fido.modules.product.dto.response.AdminCatalogMetaDtoV2;
import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeTypeDto;
import com.fido.modules.product.dto.response.BrandDto;
import com.fido.modules.product.dto.response.CatalogMetaDto;
import com.fido.modules.product.dto.response.CategoryDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.entity.AttributeValueType;
import com.fido.modules.product.mapper.AttributeMapper;
import com.fido.modules.product.mapper.CatalogMapper;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;
import com.fido.modules.product.repository.BrandRepository;
import com.fido.modules.product.repository.CategoryRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CatalogMetaService {
    private final CategoryRepository categories;
    private final BrandRepository brands;
    private final AttributeTypeRepository types;
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;

    public CatalogMetaService(
            CategoryRepository categories,
            BrandRepository brands,
            AttributeTypeRepository types,
            AttributeRepository attributes,
            AttributeOptionRepository options) {
        this.categories = categories;
        this.brands = brands;
        this.types = types;
        this.attributes = attributes;
        this.options = options;
    }

    public CatalogMetaDto publicMeta() {
        List<CategoryDto> categoryDtos = categories.findAllByOrderByCategoryIdAsc().stream()
                .map(CatalogMapper::category)
                .toList();
        List<BrandDto> brandDtos = brands.findAllByOrderByBrandIdAsc().stream()
                .map(CatalogMapper::brand)
                .toList();
        Metadata metadata = typedMetadata();
        return new CatalogMetaDto(categoryDtos, brandDtos, metadata.types(), metadata.attributes());
    }

    public AdminCatalogMetaDtoV2 adminMeta() {
        Metadata metadata = typedMetadata();
        return new AdminCatalogMetaDtoV2(metadata.types(), metadata.attributes());
    }

    private Metadata typedMetadata() {
        List<AttributeType> typeRows = types.findAllByOrderByAttributeTypeIdAsc();
        Map<String, AttributeType> typesByCode = new HashMap<>();
        Map<Long, AttributeType> typesById = new HashMap<>();
        for (AttributeType type : typeRows) {
            AttributeValueType.from(type);
            if (typesByCode.put(type.getCode(), type) != null) {
                throw new IllegalStateException("Duplicate canonical attribute type code");
            }
            typesById.put(type.getAttributeTypeId(), type);
        }
        if (typesByCode.size() != AttributeValueType.values().length) {
            throw new IllegalStateException("The four canonical attribute types must be seeded");
        }

        List<AttributeTypeDto> typeDtos = new ArrayList<>();
        for (AttributeValueType valueType : AttributeValueType.values()) {
            AttributeType type = typesByCode.get(valueType.name());
            if (type == null) {
                throw new IllegalStateException("A canonical attribute type is missing from system seed");
            }
            typeDtos.add(AttributeMapper.type(type));
        }

        List<Attribute> attributeRows = attributes.findAllByOrderBySortOrderAscAttributeIdAsc();
        List<Long> attributeIds = attributeRows.stream().map(Attribute::getAttributeId).toList();
        List<AttributeOption> optionRows = attributeIds.isEmpty()
                ? List.of()
                : options.findAllByAttributeIdInOrderBySortOrderAscAttributeOptionIdAsc(attributeIds);
        Map<Long, List<AttributeOption>> optionsByAttribute = optionRows.stream()
                .collect(Collectors.groupingBy(
                        AttributeOption::getAttributeId, HashMap::new, Collectors.toList()));

        List<AttributeDto> attributeDtos = attributeRows.stream().map(attribute -> {
            AttributeType type = typesById.get(attribute.getAttributeTypeId());
            if (type == null) {
                throw new IllegalStateException("Attribute refers to a missing canonical type");
            }
            AttributeValueType valueType = AttributeValueType.from(type);
            List<AttributeOption> attributeOptions =
                    optionsByAttribute.getOrDefault(attribute.getAttributeId(), List.of());
            if (valueType != AttributeValueType.OPTION && !attributeOptions.isEmpty()) {
                throw new IllegalStateException("Only OPTION attributes may own options");
            }
            return AttributeMapper.attribute(attribute, type, attributeOptions);
        }).toList();

        return new Metadata(List.copyOf(typeDtos), attributeDtos);
    }

    private record Metadata(List<AttributeTypeDto> types, List<AttributeDto> attributes) {}
}
