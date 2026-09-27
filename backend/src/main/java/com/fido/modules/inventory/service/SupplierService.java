package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.inventory.dto.request.SupplierCreateRequest;
import com.fido.modules.inventory.dto.request.SupplierPatchRequest;
import com.fido.modules.inventory.dto.response.SupplierDto;
import com.fido.modules.inventory.entity.Supplier;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.SupplierRepository;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SupplierService {

    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final SupplierRepository suppliers;
    private final AuditService audit;

    public SupplierService(
            SupplierRepository suppliers,
            AuditService audit
    ) {
        this.suppliers = suppliers;
        this.audit = audit;
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public ApiListResponse<SupplierDto> list(
            String q,
            String usageStatus,
            Integer page,
            Integer pageSize
    ) {
        if (usageStatus != null) {
            InventoryPolicy.requireSupplierStatus(usageStatus);
        }

        Pagination pagination = Pagination.of(page, pageSize);

        Specification<Supplier> specification =
                supplierSpec(q, usageStatus);

        var result = suppliers.findAll(
                specification,
                pagination.toPageable()
        );

        var data = result.getContent()
                .stream()
                .map(InventoryMapper::supplier)
                .toList();

        return ApiListResponse.of(
                data,
                pagination.meta(result.getTotalElements())
        );
    }

    @PreAuthorize(READ)
    @Transactional(readOnly = true)
    public SupplierDto detail(Long supplierId) {
        return InventoryMapper.supplier(
                supplier(supplierId)
        );
    }

    @PreAuthorize(WRITE)
    public SupplierDto create(
            Long actor,
            SupplierCreateRequest request
    ) {
        InventoryPolicy.requireSupplierStatus(
                request.usage_status()
        );

        Supplier supplier = new Supplier();
        supplier.setName(request.name());
        supplier.setPhone(request.phone());
        supplier.setEmail(request.email());
        supplier.setAddress(request.address());
        supplier.setUsageStatus(request.usage_status());
        supplier.setNote(request.note());

        suppliers.save(supplier);

        audit.record(
                actor,
                "SUPPLIER_CREATE",
                "SUPPLIER",
                supplier.getSupplierId()
        );

        return InventoryMapper.supplier(supplier);
    }

    @PreAuthorize(WRITE)
    public SupplierDto update(
            Long actor,
            Long supplierId,
            SupplierPatchRequest request
    ) {
        Supplier supplier = supplier(supplierId);

        if (request.getName() != null) {
            supplier.setName(request.getName());
        }

        if (request.isPhonePresent()) {
            supplier.setPhone(request.getPhone());
        }

        if (request.isEmailPresent()) {
            supplier.setEmail(request.getEmail());
        }

        if (request.isAddressPresent()) {
            supplier.setAddress(request.getAddress());
        }

        if (request.getUsageStatus() != null) {
            InventoryPolicy.requireSupplierStatus(
                    request.getUsageStatus()
            );

            supplier.setUsageStatus(
                    request.getUsageStatus()
            );
        }

        if (request.isNotePresent()) {
            supplier.setNote(request.getNote());
        }

        suppliers.save(supplier);

        audit.record(
                actor,
                "SUPPLIER_UPDATE",
                "SUPPLIER",
                supplierId
        );

        return InventoryMapper.supplier(supplier);
    }

    private Specification<Supplier> supplierSpec(
            String q,
            String usageStatus
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (q != null && !q.isBlank()) {
                String value =
                        "%" + q.trim().toLowerCase(Locale.ROOT) + "%";

                predicates.add(
                        cb.or(
                                cb.like(
                                        cb.lower(root.get("name")),
                                        value
                                ),
                                cb.like(
                                        cb.lower(root.get("phone")),
                                        value
                                ),
                                cb.like(
                                        cb.lower(root.get("email")),
                                        value
                                ),
                                cb.like(
                                        cb.lower(root.get("address")),
                                        value
                                )
                        )
                );
            }

            if (usageStatus != null) {
                predicates.add(
                        cb.equal(
                                root.get("usageStatus"),
                                usageStatus
                        )
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }

    private Supplier supplier(Long supplierId) {
        return suppliers.findById(supplierId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }
}

