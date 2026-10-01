package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.product.dto.request.SizeSystemCreateRequest;
import com.fido.modules.product.dto.request.SizeSystemPatchRequest;
import com.fido.modules.product.dto.response.SizeSystemDto;
import com.fido.modules.product.entity.SizeSystem;
import com.fido.modules.product.entity.SizeValue;
import com.fido.modules.product.repository.ProductRepository;
import com.fido.modules.product.repository.ProductVariantRepository;
import com.fido.modules.product.repository.SizeSystemRepository;
import com.fido.modules.product.repository.SizeValueRepository;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SizeSystemAdminService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CATALOG_WRITE')";

    private final SizeSystemRepository sizeSystems;
    private final SizeValueRepository sizeValues;
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CatalogReferenceService references;
    private final CatalogMetaService metaService;
    private final AuditService audit;
    private final EntityManager em;

    public SizeSystemAdminService(
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ProductRepository products,
            ProductVariantRepository variants,
            CatalogReferenceService references,
            CatalogMetaService metaService,
            AuditService audit,
            EntityManager em
    ) {
        this.sizeSystems = sizeSystems;
        this.sizeValues = sizeValues;
        this.products = products;
        this.variants = variants;
        this.references = references;
        this.metaService = metaService;
        this.audit = audit;
        this.em = em;
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto createSizeSystem(
            Long actor,
            SizeSystemCreateRequest request
    ) {
        SizeSystem sizeSystem = new SizeSystem();
        sizeSystem.setCode(request.code());
        sizeSystem.setName(request.name());

        sizeSystems.save(sizeSystem);

        var requestedValues = request.size_values() == null
                ? List.<SizeSystemCreateRequest.SizeValueInput>of()
                : request.size_values();

        validateCodes(
                requestedValues.stream()
                        .map(SizeSystemCreateRequest.SizeValueInput::code)
                        .toList()
        );

        for (var item : requestedValues) {
            SizeValue value = new SizeValue();
            value.setSizeSystemId(sizeSystem.getSizeSystemId());
            value.setCode(item.code());
            value.setDisplayName(item.display_name());
            value.setSortOrder(item.sort_order());

            sizeValues.save(value);
        }

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.SIZE_SYSTEM_CREATE,
                        AuditTargetType.SIZE_SYSTEM,
                        sizeSystem.getSizeSystemId()
                )
        );

        return metaService.sizeSystemDto(
                sizeSystem.getSizeSystemId()
        );
    }

    @PreAuthorize(WRITE)
    public SizeSystemDto updateSizeSystem(
            Long actor,
            Long sizeSystemId,
            SizeSystemPatchRequest request
    ) {
        SizeSystem sizeSystem = references.sizeSystem(sizeSystemId);

        if (request.getCode() != null) {
            sizeSystem.setCode(request.getCode());
        }

        if (request.getName() != null) {
            sizeSystem.setName(request.getName());
        }

        sizeSystems.save(sizeSystem);

        if (request.isSizeValuesPresent()) {
            replaceSizeValues(
                    sizeSystemId,
                    request.getSizeValues()
            );
        }

        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.SIZE_SYSTEM_UPDATE,
                        AuditTargetType.SIZE_SYSTEM,
                        sizeSystemId
                )
        );

        return metaService.sizeSystemDto(sizeSystemId);
    }

    @PreAuthorize(WRITE)
    public void deleteSizeSystem(
            Long actor,
            Long sizeSystemId
    ) {
        SizeSystem sizeSystem = references.sizeSystem(sizeSystemId);

        if (products.existsBySizeSystemId(sizeSystemId)) {
            conflict();
        }

        var currentValues =
                sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                );

        for (SizeValue value : currentValues) {
            if (variants.existsBySizeValueId(value.getSizeValueId())) {
                conflict();
            }

            sizeValues.delete(value);
        }

        sizeSystems.delete(sizeSystem);
        em.flush();

        audit.record(
                AuditEvent.of(
                        actor,
                        AuditAction.SIZE_SYSTEM_DELETE,
                        AuditTargetType.SIZE_SYSTEM,
                        sizeSystemId
                )
        );
    }

    private void replaceSizeValues(
            Long sizeSystemId,
            List<SizeSystemPatchRequest.SizeValueInput> requested
    ) {
        validateCodes(
                requested.stream()
                        .map(SizeSystemPatchRequest.SizeValueInput::code)
                        .toList()
        );

        var currentValues =
                sizeValues.findAllBySizeSystemIdOrderBySortOrderAscSizeValueIdAsc(
                        sizeSystemId
                );

        var valuesById = indexById(currentValues);
        var keptIds = new HashSet<Long>();

        for (var item : requested) {
            upsertRequestedValue(
                    sizeSystemId,
                    item,
                    valuesById,
                    keptIds
            );
        }

        deleteRemovedValues(
                currentValues,
                keptIds
        );
    }

    private Map<Long, SizeValue> indexById(
            List<SizeValue> values
    ) {
        var result = new HashMap<Long, SizeValue>();

        values.forEach(value ->
                result.put(
                        value.getSizeValueId(),
                        value
                )
        );

        return result;
    }

    private void upsertRequestedValue(
            Long sizeSystemId,
            SizeSystemPatchRequest.SizeValueInput item,
            Map<Long, SizeValue> valuesById,
            Set<Long> keptIds
    ) {
        if (item.size_value_id() == null) {
            createSizeValue(
                    sizeSystemId,
                    item
            );
            return;
        }

        Long sizeValueId = item.size_value_id();

        if (!keptIds.add(sizeValueId)) {
            conflict();
        }

        SizeValue value = valuesById.get(sizeValueId);

        if (value == null) {
            notFound();
        }

        requireMeaningChangeAllowed(
                value,
                item
        );

        applySizeValuePatch(
                value,
                item
        );

        sizeValues.save(value);
    }

    private void createSizeValue(
            Long sizeSystemId,
            SizeSystemPatchRequest.SizeValueInput item
    ) {
        SizeValue value = new SizeValue();
        value.setSizeSystemId(sizeSystemId);
        value.setCode(item.code());
        value.setDisplayName(item.display_name());
        value.setSortOrder(item.sort_order());

        sizeValues.save(value);
    }

    private void requireMeaningChangeAllowed(
            SizeValue value,
            SizeSystemPatchRequest.SizeValueInput item
    ) {
        boolean meaningChanges =
                !value.getCode().equals(item.code())
                || !value.getDisplayName().equals(item.display_name());

        if (meaningChanges
                && variants.existsBySizeValueId(value.getSizeValueId())) {
            conflict();
        }
    }

    private void applySizeValuePatch(
            SizeValue value,
            SizeSystemPatchRequest.SizeValueInput item
    ) {
        value.setCode(item.code());
        value.setDisplayName(item.display_name());
        value.setSortOrder(item.sort_order());
    }

    private void deleteRemovedValues(
            List<SizeValue> currentValues,
            Set<Long> keptIds
    ) {
        for (SizeValue value : currentValues) {
            if (keptIds.contains(value.getSizeValueId())) {
                continue;
            }

            if (variants.existsBySizeValueId(value.getSizeValueId())) {
                conflict();
            }

            sizeValues.delete(value);
        }
    }

    private void validateCodes(List<String> codes) {
        var normalizedCodes = new HashSet<String>();

        for (String code : codes) {
            if (!normalizedCodes.add(
                    code.toLowerCase(Locale.ROOT)
            )) {
                conflict();
            }
        }
    }

    private void conflict() {
        throw new ResponseStatusException(HttpStatus.CONFLICT);
    }

    private void notFound() {
        throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
}
