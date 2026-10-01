package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEvent;
import com.fido.modules.audit.service.AuditService;
import com.fido.modules.audit.service.AuditTargetType;
import com.fido.modules.inventory.dto.request.SupplierCreateRequest;
import com.fido.modules.inventory.dto.request.SupplierPatchRequest;
import com.fido.modules.inventory.dto.response.SupplierDto;
import com.fido.modules.inventory.entity.Supplier;
import com.fido.modules.inventory.mapper.InventoryMapper;
import com.fido.modules.inventory.repository.SupplierRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class SupplierCommandService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final SupplierRepository suppliers;
    private final AuditService audit;

    public SupplierCommandService(
            SupplierRepository suppliers,
            AuditService audit
    ) {
        this.suppliers = suppliers;
        this.audit = audit;
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
                AuditEvent.of(
                        actor,
                        AuditAction.SUPPLIER_CREATE,
                        AuditTargetType.SUPPLIER,
                        supplier.getSupplierId()
                )
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
                AuditEvent.of(
                        actor,
                        AuditAction.SUPPLIER_UPDATE,
                        AuditTargetType.SUPPLIER,
                        supplierId
                )
        );

        return InventoryMapper.supplier(supplier);
    }

    private Supplier supplier(Long supplierId) {
        return suppliers.findById(supplierId)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }
}

