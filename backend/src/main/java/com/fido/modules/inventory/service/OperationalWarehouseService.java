package com.fido.modules.inventory.service;

import com.fido.modules.inventory.entity.Warehouse;
import com.fido.modules.inventory.repository.WarehouseRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

/** Tìm đúng một kho ACTIVE từ DB; client không tự chọn kho vận hành trong phiên bản hiện tại. */
@Service
public class OperationalWarehouseService {
    private static final String ACTIVE = "ACTIVE";
    private static final String CONFIGURATION_ERROR = "INVENTORY_WAREHOUSE_CONFIGURATION";
    private final WarehouseRepository warehouses;

    public OperationalWarehouseService(WarehouseRepository warehouses) {
        this.warehouses = warehouses;
    }

    public Long requireOperationalWarehouseId() {
        List<Warehouse> active = warehouses.findAllByStatusOrderByWarehouseIdAsc(ACTIVE);
        if (active.size() != 1 || active.get(0).getWarehouseId() == null) {
            throw configurationError();
        }
        return active.get(0).getWarehouseId();
    }

    /** Kho lưu trên chứng từ phải khớp kho vận hành, tránh chuyển bút toán sang kho khác. */
    public void requireOperationalWarehouse(Long candidateWarehouseId) {
        if (candidateWarehouseId == null
                || !Objects.equals(candidateWarehouseId, requireOperationalWarehouseId())) {
            throw configurationError();
        }
    }

    private ResponseStatusException configurationError() {
        return new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, CONFIGURATION_ERROR);
    }
}
