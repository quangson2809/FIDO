package com.fido.modules.product.service;

import com.fido.modules.audit.service.AuditService;
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
    private final CatalogQueryService query;
    private final AuditService audit;
    private final EntityManager em;

    public SizeSystemAdminService(
            SizeSystemRepository sizeSystems,
            SizeValueRepository sizeValues,
            ProductRepository products,
            ProductVariantRepository variants,
            CatalogReferenceService references,
            CatalogQueryService query,
            AuditService audit,
            EntityManager em
    ) {
        this.sizeSystems = sizeSystems;
        this.sizeValues = sizeValues;
        this.products = products;
        this.variants = variants;
        this.references = references;
        this.query = query;
        this.audit = audit;
        this.em = em;
    }

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
                actor,
                "SIZE_SYSTEM_CREATE",
                "SIZE_SYSTEM",
                sizeSystem.getSizeSystemId()
        );

        return query.sizeSystemDtoInternal(
                sizeSystem.getSizeSystemId()
        );
    }

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
                actor,
                "SIZE_SYSTEM_UPDATE",
                "SIZE_SYSTEM",
                sizeSystemId
        );

        return query.sizeSystemDtoInternal(sizeSystemId);
    }

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
                actor,
                "SIZE_SYSTEM_DELETE",
                "SIZE_SYSTEM",
                sizeSystemId
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

        var valuesById = new HashMap<Long, SizeValue>();
        currentValues.forEach(value ->
                valuesById.put(
                        value.getSizeValueId(),
                        value
                )
        );

        var keptIds = new HashSet<Long>();

        for (var item : requested) {
            if (item.size_value_id() == null) {
                SizeValue value = new SizeValue();
                value.setSizeSystemId(sizeSystemId);
                value.setCode(item.code());
                value.setDisplayName(item.display_name());
                value.setSortOrder(item.sort_order());

                sizeValues.save(value);
                continue;
            }

            if (!keptIds.add(item.size_value_id())) {
                conflict();
            }

            SizeValue value = valuesById.get(
                    item.size_value_id()
            );

            if (value == null) {
                notFound();
            }

            boolean meaningChanges =
                    !value.getCode().equals(item.code())
                    || !value.getDisplayName().equals(item.display_name());

            if (meaningChanges
                    && variants.existsBySizeValueId(value.getSizeValueId())) {
                conflict();
            }

            value.setCode(item.code());
            value.setDisplayName(item.display_name());
            value.setSortOrder(item.sort_order());

            sizeValues.save(value);
        }

        for (SizeValue value : currentValues) {
            if (!keptIds.contains(value.getSizeValueId())) {
                if (variants.existsBySizeValueId(value.getSizeValueId())) {
                    conflict();
                }

                sizeValues.delete(value);
            }
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
