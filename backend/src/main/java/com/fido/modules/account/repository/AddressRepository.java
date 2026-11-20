package com.fido.modules.account.repository;

import com.fido.modules.account.entity.Address;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AddressRepository extends Repository<Address, Long> {
    Optional<Address> findById(Long id);

    Address save(Address entity);

    Address saveAndFlush(Address entity);

    void flush();

    List<Address> findByAccountIdOrderByIdAsc(Long accountId);

    Optional<Address> findFirstByAccountIdAndIdNotOrderByUpdatedAtDescIdDesc(
            Long accountId, Long excludedId);

    /** Flush trước bulk update; lần đọc tiếp theo phải nhận trạng thái mới từ DB. */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(
            value =
                    """
                    UPDATE addresses
                    SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP(6)
                    WHERE account_id = :accountId AND is_default = TRUE
                      AND (:keptDefaultId IS NULL OR id <> :keptDefaultId)
                    """,
            nativeQuery = true)
    void clearDefaultsExcept(
            @Param("accountId") Long accountId, @Param("keptDefaultId") Long keptDefaultId);

    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(
            value =
                    """
                    UPDATE addresses
                    SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP(6)
                    WHERE account_id = :accountId AND id = :addressId AND is_default = FALSE
                    """,
            nativeQuery = true)
    void markDefault(@Param("accountId") Long accountId, @Param("addressId") Long addressId);

    Optional<Address> findByIdAndAccountId(Long id, Long accountId);

    void delete(Address address);
}
