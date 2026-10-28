package com.fido.modules.inventory.service;

import com.fido.modules.audit.service.AuditAction;
import com.fido.modules.audit.service.AuditEntityType;
import com.fido.modules.audit.service.AuditWriteEvent;
import com.fido.modules.audit.service.AuditWriteService;
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

import java.util.Locale;
import java.util.UUID;

@Service
@Transactional
public class SupplierCommandService {

    private static final String WRITE =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_WRITE')";

    private final SupplierRepository suppliers;
    private final AuditWriteService audit;

    public SupplierCommandService(SupplierRepository suppliers, AuditWriteService audit) {
        this.suppliers = suppliers;
        this.audit = audit;
    }

    @PreAuthorize(WRITE)
    public SupplierDto create(Long actor, SupplierCreateRequest request) {
        InventoryPolicy.requireSupplierStatus(request.status());

        Supplier supplier = new Supplier();
        supplier.setCode("SUP-" + UUID.randomUUID().toString().replace("-", "").toUpperCase(Locale.ROOT));
        supplier.setName(request.name().trim());
        supplier.setPhone(request.phone());
        supplier.setEmail(request.email());
        supplier.setStatus(request.status());

        suppliers.save(supplier);
        audit.record(AuditWriteEvent.of(AuditAction.SUPPLIER_CREATE, AuditEntityType.SUPPLIER, supplier.getSupplierId().toString()));
        return InventoryMapper.supplier(supplier);
    }

    @PreAuthorize(WRITE)
    public SupplierDto update(Long actor, Long supplierId, SupplierPatchRequest request) {
        Supplier supplier = supplier(supplierId);

        if (request.getName() != null) supplier.setName(request.getName().trim());
        if (request.isPhonePresent()) supplier.setPhone(request.getPhone());
        if (request.isEmailPresent()) supplier.setEmail(request.getEmail());
        if (request.getStatus() != null) {
            InventoryPolicy.requireSupplierStatus(request.getStatus());
            supplier.setStatus(request.getStatus());
        }

        suppliers.save(supplier);
        audit.record(AuditWriteEvent.of(AuditAction.SUPPLIER_UPDATE, AuditEntityType.SUPPLIER, supplierId.toString()));
        return InventoryMapper.supplier(supplier);
    }

    private Supplier supplier(Long supplierId) {
        return suppliers.findById(supplierId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
