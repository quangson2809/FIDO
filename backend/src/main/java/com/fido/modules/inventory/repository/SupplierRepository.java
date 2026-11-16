package com.fido.modules.inventory.repository;

import com.fido.modules.inventory.entity.Supplier;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.Repository;

import java.util.Optional;

/** Giữ lịch sử nhà cung cấp bằng trạng thái; API hiện tại không cung cấp thao tác xóa. */
public interface SupplierRepository
        extends Repository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    Optional<Supplier> findById(Long id);

    Supplier save(Supplier entity);
}
