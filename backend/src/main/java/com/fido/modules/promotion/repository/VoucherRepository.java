package com.fido.modules.promotion.repository;

import com.fido.modules.promotion.entity.Voucher;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface VoucherRepository extends Repository<Voucher, Long> {
    Optional<Voucher> findById(Long id);
    Voucher save(Voucher entity);
}
