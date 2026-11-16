package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.AddressRequest;
import com.fido.modules.account.dto.request.ProfilePatch;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.AddressDto;
import com.fido.modules.account.entity.Account;
import com.fido.modules.account.entity.Address;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AddressRepository;
import com.fido.modules.account.service.identity.AccountMutationLockService;

import jakarta.persistence.EntityManager;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional
public class ProfileCommandService {
    private final AccountRepository accounts;
    private final AddressRepository addresses;
    private final AccountMutationLockService accountLocks;
    private final EntityManager entityManager;

    public ProfileCommandService(
            AccountRepository accounts,
            AddressRepository addresses,
            AccountMutationLockService accountLocks,
            EntityManager entityManager) {
        this.accounts = accounts;
        this.addresses = addresses;
        this.accountLocks = accountLocks;
        this.entityManager = entityManager;
    }

    public AccountDto update(Long actor, ProfilePatch request) {
        Account account =
                accounts.findByIdForUpdate(actor)
                        .filter(Account::isActive)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (request.full_name() != null) account.setFullName(request.full_name().trim());
        if (request.email() != null) account.setEmail(request.email());
        accounts.save(account);
        entityManager.flush();
        return AccountMapper.account(account);
    }

    public AddressDto addAddress(Long actor, AddressRequest request) {
        accountLocks.lock(actor);
        Account account = requireActiveOwner(actor);
        requireCompleteAddress(request);
        List<Address> existing = addresses.findByAccountIdOrderByIdAsc(actor);
        ensureExactlyOneDefault(existing);
        boolean makeDefault = existing.isEmpty() || Boolean.TRUE.equals(request.is_default());
        if (makeDefault) clearDefault(existing);
        Address address = new Address();
        address.setAccountId(account.getAccountId());
        applyAllFields(address, request);
        address.setDefault(makeDefault);
        return toDto(addresses.save(address));
    }

    /**
     * actor là chủ tài khoản từ JWT, addressId từ URL; request có cờ hiện diện để cập nhật từng phần.
     * Khóa tài khoản để việc đổi địa chỉ và chọn một mặc định không đua với thêm/xóa địa chỉ khác.
     */
    public AddressDto updateAddress(Long actor, Long addressId, AddressRequest request) {
        accountLocks.lock(actor);
        requireActiveOwner(actor);
        if (!request.hasAnyField())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "EMPTY_PATCH");
        Address address = ownedAddress(actor, addressId);
        List<Address> currentAddresses = addresses.findByAccountIdOrderByIdAsc(actor);
        ensureExactlyOneDefault(currentAddresses);
        if (!address.hasStructuredAddress()) {
            requireCompleteAddress(request);
            applyAllFields(address, request);
        } else applyPresentFields(address, request);
        if (request.defaultPresent()) {
            if (Boolean.TRUE.equals(request.is_default())) {
                clearDefault(addresses.findByAccountIdOrderByIdAsc(actor));
                address.setDefault(true);
            } else if (address.isDefault()) {
                List<Address> all = addresses.findByAccountIdOrderByIdAsc(actor);
                boolean hasAnotherAddress =
                        all.stream().anyMatch(a -> !a.getId().equals(address.getId()));
                if (hasAnotherAddress) {
                    promoteMostRecentOther(actor, address.getId());
                }
                // Địa chỉ duy nhất phải tiếp tục là mặc định dù request yêu cầu bỏ chọn.
            }
        }
        Address saved = addresses.save(address);
        entityManager.flush();
        return toDto(saved);
    }

    public void deleteAddress(Long actor, Long addressId) {
        accountLocks.lock(actor);
        requireActiveOwner(actor);
        Address address = ownedAddress(actor, addressId);
        List<Address> all = addresses.findByAccountIdOrderByIdAsc(actor);
        ensureExactlyOneDefault(all);
        boolean wasDefault = address.isDefault();
        addresses.delete(address);
        entityManager.flush();
        if (wasDefault) promoteMostRecentOther(actor, addressId);
    }

    private Account requireActiveOwner(Long actor) {
        return accounts.findById(actor)
                .filter(Account::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Address ownedAddress(Long actor, Long id) {
        return addresses
                .findByIdAndAccountId(id, actor)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    /**
     * Sửa dữ liệu cũ thiếu/thừa mặc định dưới khóa tài khoản. Ưu tiên địa chỉ đã mặc định, rồi thời
     * gian sửa và ID mới nhất; không tự điền địa chỉ thiếu.
     */
    private void ensureExactlyOneDefault(List<Address> all) {
        if (all.isEmpty()) {
            return;
        }
        List<Address> currentDefaults = all.stream().filter(Address::isDefault).toList();
        if (currentDefaults.size() == 1) {
            return;
        }
        List<Address> candidates = currentDefaults.isEmpty() ? all : currentDefaults;
        Comparator<Address> latestFirst =
                Comparator.comparing(
                                Address::getUpdatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Address::getId, Comparator.reverseOrder());
        Address winner = candidates.stream().min(latestFirst).orElseThrow();

        // Dữ liệu cũ có thể thiếu trường bắt buộc; chỉ cập nhật cột mặc định bằng SQL để không
        // lưu lại entity thiếu dữ liệu.
        entityManager.flush();
        entityManager
                .createNativeQuery(
                        "UPDATE addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP(6) "
                                + "WHERE account_id = ? AND is_default = TRUE AND id <> ?")
                .setParameter(1, winner.getAccountId())
                .setParameter(2, winner.getId())
                .executeUpdate();
        entityManager
                .createNativeQuery(
                        "UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP(6) "
                                + "WHERE account_id = ? AND id = ? AND is_default = FALSE")
                .setParameter(1, winner.getAccountId())
                .setParameter(2, winner.getId())
                .executeUpdate();
        all.forEach(entityManager::refresh);
    }

    private void clearDefault(List<Address> all) {
        if (all.isEmpty()) {
            return;
        }
        Long accountId = all.get(0).getAccountId();
        entityManager.flush();
        entityManager
                .createNativeQuery(
                        "UPDATE addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP(6) "
                                + "WHERE account_id = ? AND is_default = TRUE")
                .setParameter(1, accountId)
                .executeUpdate();
        all.forEach(entityManager::refresh);
    }

    /**
     * actor là chủ sổ địa chỉ; excludedId là địa chỉ vừa bỏ mặc định/xóa.
     * Chọn địa chỉ còn lại sửa gần nhất; cập nhật cột mặc định trực tiếp để hỗ trợ cả dữ liệu cũ thiếu
     * trường.
     */
    private void promoteMostRecentOther(Long actor, Long excludedId) {
        Long promotedId =
                addresses.findByAccountIdMostRecentlyUpdated(actor).stream()
                        .filter(address -> !address.getId().equals(excludedId))
                        .map(Address::getId)
                        .findFirst()
                        .orElse(null);
        if (promotedId == null) {
            return;
        }
        entityManager.flush();
        entityManager
                .createNativeQuery(
                        "UPDATE addresses SET is_default = FALSE, updated_at = CURRENT_TIMESTAMP(6) "
                                + "WHERE account_id = ? AND is_default = TRUE AND id <> ?")
                .setParameter(1, actor)
                .setParameter(2, promotedId)
                .executeUpdate();
        entityManager
                .createNativeQuery(
                        "UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP(6) "
                                + "WHERE account_id = ? AND id = ? AND is_default = FALSE")
                .setParameter(1, actor)
                .setParameter(2, promotedId)
                .executeUpdate();
        addresses.findByAccountIdOrderByIdAsc(actor).forEach(entityManager::refresh);
    }

    private static void requireCompleteAddress(AddressRequest r) {
        if (!r.hasAllRequiredFields())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ADDRESS_FIELDS_REQUIRED");
    }

    private static void applyAllFields(Address a, AddressRequest r) {
        a.setRecipientName(r.recipient_name().trim());
        a.setRecipientPhone(r.recipient_phone().trim());
        a.setProvince(r.province().trim());
        a.setDistrict(r.district().trim());
        a.setWard(r.ward().trim());
        a.setAddressLine(r.address_line().trim());
    }

    private static void applyPresentFields(Address a, AddressRequest r) {
        if (r.recipientNamePresent()) a.setRecipientName(r.recipient_name().trim());
        if (r.recipientPhonePresent()) a.setRecipientPhone(r.recipient_phone().trim());
        if (r.provincePresent()) a.setProvince(r.province().trim());
        if (r.districtPresent()) a.setDistrict(r.district().trim());
        if (r.wardPresent()) a.setWard(r.ward().trim());
        if (r.addressLinePresent()) a.setAddressLine(r.address_line().trim());
    }

    public static AddressDto toDto(Address a) {
        return new AddressDto(
                a.getId(),
                a.getRecipientName(),
                a.getRecipientPhone(),
                a.getProvince(),
                a.getDistrict(),
                a.getWard(),
                a.getAddressLine(),
                a.isDefault());
    }
}
