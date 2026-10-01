package com.fido.modules.inventory.service;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
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
@Transactional(readOnly = true)
public class SupplierQueryService {
    private static final String READ =
            "hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_INVENTORY_READ')";
    private final SupplierRepository suppliers;

    public SupplierQueryService(SupplierRepository suppliers) {
        this.suppliers = suppliers;
    }

    @PreAuthorize(READ)
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
    public SupplierDto detail(Long supplierId) {
        return InventoryMapper.supplier(
                supplier(supplierId)
        );
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
