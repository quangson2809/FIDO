package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Address;
import org.springframework.data.repository.Repository;
import java.util.Optional;

/** Persistence only. Delete operations are intentionally not exposed by default. */
public interface AddressRepository extends Repository<Address, Long> {
    Optional<Address> findById(Long id);
    Address save(Address entity);
}
