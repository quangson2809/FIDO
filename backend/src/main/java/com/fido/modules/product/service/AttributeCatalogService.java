package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.product.dto.request.AttributeCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionCreateRequest;
import com.fido.modules.product.dto.request.AttributeOptionPatchRequest;
import com.fido.modules.product.dto.request.AttributePatchRequest;
import com.fido.modules.product.dto.response.AttributeDto;
import com.fido.modules.product.dto.response.AttributeOptionDto;
import com.fido.modules.product.entity.Attribute;
import com.fido.modules.product.entity.AttributeOption;
import com.fido.modules.product.mapper.AttributeMapper;
import com.fido.modules.product.repository.AttributeOptionRepository;
import com.fido.modules.product.repository.AttributeRepository;
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
public class AttributeCatalogService {
    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";
    private final AttributeRepository attributes;
    private final AttributeOptionRepository options;
    private final ProductAttributeValueRepository productValues;
    private final AuditService audit;
    private final EntityManager entityManager;

    public AttributeCatalogService(
            AttributeRepository attributes,
            AttributeOptionRepository options,
            ProductAttributeValueRepository productValues,
            AuditService audit,
            EntityManager entityManager) {
        this.attributes = attributes;
        this.options = options;
        this.productValues = productValues;
        this.audit = audit;
        this.entityManager = entityManager;
    }

    @PreAuthorize(WRITE)
    public AttributeDto createAttribute(Long actor, AttributeCreateRequest request) {
        String code = request.code().trim();
        String name = request.name().trim();
        if (attributes.existsByCode(code)) throw conflict("Attribute code already exists");

        Attribute attribute = new Attribute();
        attribute.setCode(code);
        attribute.setName(name);
        attribute.setRequired(Boolean.TRUE.equals(request.is_required()));
        attribute.setVariantDefining(Boolean.TRUE.equals(request.is_variant_defining()));
        attribute.setSortOrder(request.sort_order() == null ? 0 : request.sort_order());

        attributes.save(attribute);
        flushOrConflict("Attribute code conflicts with existing data");
        audit.record(AuditEvent.of(actor, AuditAction.ATTRIBUTE_CREATE,
                AuditTargetType.ATTRIBUTE, attribute.getAttributeId()));
        return AttributeMapper.attribute(attribute, List.of());
    }

    @PreAuthorize(WRITE)
    public AttributeDto updateAttribute(Long actor, Long attributeId, AttributePatchRequest request) {
        if (!request.hasChanges()) throw badRequest("Attribute patch must contain a change");
        Attribute attribute = requireAttribute(attributeId);
        if (request.isNamePresent()) attribute.setName(request.getName().trim());
        if (request.isRequiredPresent()) {
            boolean required = Boolean.TRUE.equals(request.getRequired());
            if (required && !attribute.isRequired()
                    && productValues.existsActiveProductMissingAttributeValue(attributeId)) {
                throw conflict("Required Attribute is missing from an ACTIVE Product");
            }
            attribute.setRequired(required);
        }
        if (request.isVariantDefiningPresent()) {
            attribute.setVariantDefining(Boolean.TRUE.equals(request.getVariantDefining()));
        }
        if (request.isSortOrderPresent()) attribute.setSortOrder(request.getSortOrder());

        attributes.save(attribute);
        flushOrConflict("Attribute update conflicts with existing data");
        audit.record(AuditEvent.of(actor, AuditAction.ATTRIBUTE_UPDATE,
                AuditTargetType.ATTRIBUTE, attributeId));
        return AttributeMapper.attribute(attribute, findOptions(attributeId));
    }

    @PreAuthorize(WRITE)
    public AttributeOptionDto createOption(Long actor, Long attributeId, AttributeOptionCreateRequest request) {
        requireAttribute(attributeId);
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
        audit.record(AuditEvent.of(actor, AuditAction.ATTRIBUTE_OPTION_CREATE,
                AuditTargetType.ATTRIBUTE_OPTION, option.getAttributeOptionId()));
        return AttributeMapper.option(option);
    }

    @PreAuthorize(WRITE)
    public AttributeOptionDto updateOption(
            Long actor, Long attributeId, Long optionId, AttributeOptionPatchRequest request) {
        requireAttribute(attributeId);
        if (!request.hasChanges()) throw badRequest("Attribute option patch must contain a change");
        AttributeOption option = options.findByAttributeIdAndAttributeOptionId(attributeId, optionId)
                .orElseThrow(AttributeCatalogService::notFound);
        if (request.isLabelPresent()) option.setLabel(request.getLabel().trim());
        if (request.isSortOrderPresent()) option.setSortOrder(request.getSortOrder());

        options.save(option);
        flushOrConflict("Option update conflicts with existing data");
        audit.record(AuditEvent.of(actor, AuditAction.ATTRIBUTE_OPTION_UPDATE,
                AuditTargetType.ATTRIBUTE_OPTION, optionId));
        return AttributeMapper.option(option);
    }

    private Attribute requireAttribute(Long attributeId) {
        return attributes.findById(attributeId).orElseThrow(AttributeCatalogService::notFound);
    }
    private List<AttributeOption> findOptions(Long attributeId) {
        return options.findAllByAttributeIdOrderBySortOrderAscAttributeOptionIdAsc(attributeId);
    }
    private void flushOrConflict(String message) {
        try { entityManager.flush(); }
        catch (DataIntegrityViolationException exception) {
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
