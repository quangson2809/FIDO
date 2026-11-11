package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Warehouse;
import org.springframework.data.repository.Repository;

import java.util.List;

public interface WarehouseRepository extends Repository<Warehouse, Long> {
    List<Warehouse> findAllByStatusOrderByWarehouseIdAsc(String status);
}
