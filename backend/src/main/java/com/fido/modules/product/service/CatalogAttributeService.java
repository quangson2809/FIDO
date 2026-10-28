package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
import com.fido.modules.product.dto.request.AttributeCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionPatchRequest;
import com.fido.modules.product.dto.request.AttributePatchRequest;
import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeOptionDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.entity.AttributeType;
import com.fido.modules.product.entity.AttributeValueType;
import com.fido.modules.product.mapper.AttributeMapper;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
import com.fido.modules.product.repository.AttributeTypeRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository;

import jakarta.persistence.EntityManager;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional
public class CatalogAttributeService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final AttributeRepository attributes;
    private final AttributeTypeRepository types;
    private final AttributeOptionRepository options;
    private final ProductAttributeValueRepository productValues;
    private final AuditWriteService audit;
    private final EntityManager entityManager;

    public CatalogAttributeService(
            AttributeRepository attributes,
            AttributeTypeRepository types,
            AttributeOptionRepository options,
            ProductAttributeValueRepository productValues,
            AuditWriteService audit,
            EntityManager entityManager) {
        this.attributes = attributes;
        this.types = types;
        this.options = options;
        this.productValues = productValues;
        this.audit = audit;
        this.entityManager = entityManager;
    }

    @PreAuthorize(WRITE)
    public AttributeDto createAttribute(AttributeCreateRequest request) {
        AttributeType type = types.findById(request.attribute_type_id())
                .orElseThrow(() -> badRequest("Unknown attribute_type_id"));
        AttributeValueType.from(type);

        String code = request.code().trim();
        String name = request.name().trim();
        if (attributes.existsByCode(code)) {
            throw conflict("Attribute code already exists");
        }

        Attribute attribute = new Attribute();
        attribute.setAttributeTypeId(type.getAttributeTypeId());
        attribute.setCode(code);
        attribute.setName(name);
        attribute.setRequired(Boolean.TRUE.equals(request.is_required()));
        attribute.setVariantDefining(Boolean.TRUE.equals(request.is_variant_defining()));
        attribute.setSortOrder(request.sort_order() == null ? 0 : request.sort_order());

        attributes.save(attribute);
        flushOrConflict("Attribute code or type conflicts with existing data");
        audit.record(AuditWriteEvent.of(
                AuditAction.ATTRIBUTE_CREATE, AuditEntityType.ATTRIBUTE,
                attribute.getAttributeId().toString()));
        return AttributeMapper.attribute(attribute, type, List.of());
    }

    @PreAuthorize(WRITE)
    public AttributeDto updateAttribute(
            Long attributeId, AttributePatchRequest request) {
        if (!request.hasChanges()) {
            throw badRequest("Attribute patch must contain a change");
        }
        Attribute attribute = requireAttribute(attributeId);
        AttributeType type = requireType(attribute);
        AttributeValueType.from(type);

        if (request.isNamePresent()) {
            attribute.setName(request.getName().trim());
        }
        if (request.isRequiredPresent()) {
            boolean requestedRequired = Boolean.TRUE.equals(request.getRequired());
            if (requestedRequired && !attribute.isRequired()
                    && productValues.existsActiveProductMissingCompatibleValue(
                            attributeId, type.getDataType())) {
                throw conflict("Required Attribute is missing from an ACTIVE Product");
            }
            attribute.setRequired(requestedRequired);
        }
        if (request.isVariantDefiningPresent()) {
            attribute.setVariantDefining(Boolean.TRUE.equals(request.getVariantDefining()));
        }
        if (request.isSortOrderPresent()) {
            attribute.setSortOrder(request.getSortOrder());
        }

        attributes.save(attribute);
        flushOrConflict("Attribute update conflicts with existing data");
        audit.record(AuditWriteEvent.of(
                AuditAction.ATTRIBUTE_UPDATE, AuditEntityType.ATTRIBUTE, attributeId.toString()));
        return AttributeMapper.attribute(attribute, type, findOptions(attributeId));
    }

    @PreAuthorize(WRITE)
    public AttributeOptionDto createOption(
            Long attributeId, AttributeOptionCreateRequest request) {
        Attribute attribute = requireAttribute(attributeId);
        AttributeType type = requireType(attribute);
        if (AttributeValueType.from(type) != AttributeValueType.OPTION) {
            throw badRequest("Options can be created only for OPTION attributes");
        }

        String value = request.value().trim();
        String label = request.label().trim();
        if (options.existsByAttributeIdAndValue(attributeId, value)) {
            throw conflict("Option value already exists for this Attribute");
        }

        AttributeOption option = new AttributeOption();
        option.setAttributeId(attributeId);
        option.setValue(value);
        option.setLabel(label);
        option.setSortOrder(request.sort_order() == null ? 0 : request.sort_order());

        options.save(option);
        flushOrConflict("Option value conflicts with existing data");
        audit.record(AuditWriteEvent.of(
                AuditAction.ATTRIBUTE_OPTION_CREATE, AuditEntityType.ATTRIBUTE_OPTION,
                option.getAttributeOptionId().toString()));
        return AttributeMapper.option(option);
    }

    @PreAuthorize(WRITE)
    public AttributeOptionDto updateOption(
            Long attributeId,
            Long optionId,
            AttributeOptionPatchRequest request) {
        requireAttribute(attributeId);
        if (!request.hasChanges()) {
            throw badRequest("Attribute option patch must contain a change");
        }
        AttributeOption option = options.findByAttributeIdAndAttributeOptionId(attributeId, optionId)
                .orElseThrow(CatalogAttributeService::notFound);

        if (request.isLabelPresent()) {
            option.setLabel(request.getLabel().trim());
        }
        if (request.isSortOrderPresent()) {
            option.setSortOrder(request.getSortOrder());
        }

        options.save(option);
        flushOrConflict("Option update conflicts with existing data");
        audit.record(AuditWriteEvent.of(
                AuditAction.ATTRIBUTE_OPTION_UPDATE, AuditEntityType.ATTRIBUTE_OPTION, optionId.toString()));
        return AttributeMapper.option(option);
    }

    private Attribute requireAttribute(Long attributeId) {
        return attributes.findById(attributeId).orElseThrow(CatalogAttributeService::notFound);
    }

    private AttributeType requireType(Attribute attribute) {
        return types.findById(attribute.getAttributeTypeId())
                .orElseThrow(() -> new IllegalStateException("Attribute refers to a missing type"));
    }

    private List<AttributeOption> findOptions(Long attributeId) {
        return options.findAllByAttributeIdOrderBySortOrderAscAttributeOptionIdAsc(attributeId);
    }

    private void flushOrConflict(String message) {
        try {
            entityManager.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message, exception);
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Attribute resource was not found");
    }

    private static ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
