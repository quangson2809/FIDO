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

    public ProfileCommandService(
            AccountRepository accounts,
            AddressRepository addresses,
            AccountMutationLockService accountLocks) {
        this.accounts = accounts;
        this.addresses = addresses;
        this.accountLocks = accountLocks;
    }

    public AccountDto update(Long actor, ProfilePatch request) {
        Account account =
                accounts.findByIdForUpdate(actor)
                        .filter(Account::isActive)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if (request.full_name() != null) account.setFullName(request.full_name().trim());
        if (request.email() != null) account.setEmail(request.email());
        return AccountMapper.account(accounts.saveAndFlush(account));
    }

    public AddressDto addAddress(Long actor, AddressRequest request) {
        accountLocks.lock(actor);
        Account account = requireActiveOwner(actor);
        requireCompleteAddress(request);
        List<Address> existing = addresses.findByAccountIdOrderByIdAsc(actor);
        ensureExactlyOneDefault(existing);
        boolean makeDefault = existing.isEmpty() || Boolean.TRUE.equals(request.is_default());
        if (makeDefault && !existing.isEmpty()) addresses.clearDefaultsExcept(actor, null);
        Address address = new Address();
        address.setAccountId(account.getAccountId());
        applyAllFields(address, request);
        address.setDefault(makeDefault);
        return AccountMapper.address(addresses.save(address));
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
        if (ensureExactlyOneDefault(currentAddresses)) address = ownedAddress(actor, addressId);
        if (!address.hasStructuredAddress()) {
            requireCompleteAddress(request);
            applyAllFields(address, request);
        } else applyPresentFields(address, request);
        Address saved = addresses.saveAndFlush(address);
        if (request.defaultPresent()) {
            if (Boolean.TRUE.equals(request.is_default())) {
                addresses.clearDefaultsExcept(actor, null);
                addresses.markDefault(actor, addressId);
                return AccountMapper.address(ownedAddress(actor, addressId));
            } else if (saved.isDefault() && currentAddresses.size() > 1) {
                promoteMostRecentOther(actor, addressId);
                return AccountMapper.address(ownedAddress(actor, addressId));
            }
            // Địa chỉ duy nhất phải tiếp tục là mặc định dù request yêu cầu bỏ chọn.
        }
        return AccountMapper.address(saved);
    }

    public void deleteAddress(Long actor, Long addressId) {
        accountLocks.lock(actor);
        requireActiveOwner(actor);
        Address address = ownedAddress(actor, addressId);
        List<Address> all = addresses.findByAccountIdOrderByIdAsc(actor);
        if (ensureExactlyOneDefault(all)) address = ownedAddress(actor, addressId);
        boolean wasDefault = address.isDefault();
        addresses.delete(address);
        addresses.flush();
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
    private boolean ensureExactlyOneDefault(List<Address> all) {
        if (all.isEmpty()) {
            return false;
        }
        List<Address> currentDefaults = all.stream().filter(Address::isDefault).toList();
        if (currentDefaults.size() == 1) {
            return false;
        }
        List<Address> candidates = currentDefaults.isEmpty() ? all : currentDefaults;
        Comparator<Address> latestFirst =
                Comparator.comparing(
                                Address::getUpdatedAt,
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Address::getId, Comparator.reverseOrder());
        Address winner = candidates.stream().min(latestFirst).orElseThrow();

        setSoleDefault(winner.getAccountId(), winner.getId());
        return true;
    }

    private void setSoleDefault(Long accountId, Long addressId) {
        addresses.clearDefaultsExcept(accountId, addressId);
        addresses.markDefault(accountId, addressId);
    }

    /**
     * actor là chủ sổ địa chỉ; excludedId là địa chỉ vừa bỏ mặc định/xóa.
     * Chọn địa chỉ còn lại sửa gần nhất; cập nhật cột mặc định trực tiếp để hỗ trợ cả dữ liệu cũ thiếu
     * trường.
     */
    private void promoteMostRecentOther(Long actor, Long excludedId) {
        addresses
                .findFirstByAccountIdAndIdNotOrderByUpdatedAtDescIdDesc(actor, excludedId)
                .ifPresent(address -> setSoleDefault(actor, address.getId()));
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
}
