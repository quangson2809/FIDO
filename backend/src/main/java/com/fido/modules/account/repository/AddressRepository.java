package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Address;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AddressRepository extends Repository<Address, Long> {
    Optional<Address> findById(Long id);
    Address save(Address entity);
    List<Address> findByAccountIdOrderByIdAsc(Long accountId);
    @Query("""
           select a from Address a
           where a.accountId = :accountId
           order by a.updatedAt desc, a.id desc
           """)
    List<Address> findByAccountIdMostRecentlyUpdated(@Param("accountId") Long accountId);
    Optional<Address> findByIdAndAccountId(Long id, Long accountId);
    void delete(Address address);
}
