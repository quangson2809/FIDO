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
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
@Service
@Transactional
public class ProfileCommandService {
    private final AccountRepository accounts;
    private final AddressRepository addresses;
    private final AccountMutationLockService accountLocks;
    private final EntityManager entityManager;
    public ProfileCommandService(AccountRepository accounts,AddressRepository addresses,
            AccountMutationLockService accountLocks,EntityManager entityManager) {
        this.accounts=accounts; this.addresses=addresses; this.accountLocks=accountLocks; this.entityManager=entityManager;
    }
    public AccountDto update(Long actor,ProfilePatch request) {
        Account account=accounts.findByIdForUpdate(actor).filter(Account::isActive)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(request.full_name()!=null) account.setFullName(request.full_name().trim());
        if(request.email()!=null) account.setEmail(request.email());
        accounts.save(account); entityManager.flush(); return AccountMapper.account(account);
    }
    public AddressDto addAddress(Long actor,AddressRequest request) {
        accountLocks.lock(actor); Account account=requireActiveOwner(actor); requireCompleteAddress(request);
        List<Address> existing=addresses.findByAccountIdOrderByIdAsc(actor);
        boolean makeDefault=existing.isEmpty()||Boolean.TRUE.equals(request.is_default());
        if(makeDefault) clearDefault(existing);
        Address address=new Address(); address.setAccountId(account.getAccountId());
        applyAllFields(address,request); address.setDefault(makeDefault); address.setAddressText(legacyText(address));
        return toDto(addresses.save(address));
    }
    public AddressDto updateAddress(Long actor,Long addressId,AddressRequest request) {
        accountLocks.lock(actor); requireActiveOwner(actor);
        if(!request.hasAnyField()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"EMPTY_PATCH");
        Address address=ownedAddress(actor,addressId);
        if(!address.hasStructuredAddress()) { requireCompleteAddress(request); applyAllFields(address,request); }
        else applyPresentFields(address,request);
        if(request.defaultPresent()) {
            if(Boolean.TRUE.equals(request.is_default())) {
                clearDefault(addresses.findByAccountIdOrderByIdAsc(actor)); address.setDefault(true);
            } else if(address.isDefault()) {
                address.setDefault(false); promoteMostRecentOther(actor,address.getId());
            }
        }
        address.setAddressText(legacyText(address));
        Address saved=addresses.save(address); entityManager.flush(); return toDto(saved);
    }
    public void deleteAddress(Long actor,Long addressId) {
        accountLocks.lock(actor); requireActiveOwner(actor);
        Address address=ownedAddress(actor,addressId); boolean wasDefault=address.isDefault();
        addresses.delete(address); entityManager.flush();
        if(wasDefault) promoteMostRecentOther(actor,addressId);
    }
    private Account requireActiveOwner(Long actor) {
        return accounts.findById(actor).filter(Account::isActive)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private Address ownedAddress(Long actor,Long id) {
        return addresses.findByIdAndAccountId(id,actor)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private void clearDefault(List<Address> all) {
        all.stream().filter(Address::isDefault).forEach(a->{a.setDefault(false);addresses.save(a);});
    }
    private void promoteMostRecentOther(Long actor,Long excludedId) {
        addresses.findByAccountIdMostRecentlyUpdated(actor).stream().filter(a->!a.getId().equals(excludedId))
                .findFirst().ifPresent(a->{a.setDefault(true);addresses.save(a);});
    }
    private static void requireCompleteAddress(AddressRequest r) {
        if(!r.hasAllRequiredFields()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ADDRESS_FIELDS_REQUIRED");
    }
    private static void applyAllFields(Address a,AddressRequest r) {
        a.setRecipientName(r.recipient_name().trim()); a.setRecipientPhone(r.recipient_phone().trim());
        a.setProvince(r.province().trim()); a.setDistrict(r.district().trim()); a.setWard(r.ward().trim());
        a.setAddressLine(r.address_line().trim());
    }
    private static void applyPresentFields(Address a,AddressRequest r) {
        if(r.recipientNamePresent()) a.setRecipientName(r.recipient_name().trim());
        if(r.recipientPhonePresent()) a.setRecipientPhone(r.recipient_phone().trim());
        if(r.provincePresent()) a.setProvince(r.province().trim());
        if(r.districtPresent()) a.setDistrict(r.district().trim());
        if(r.wardPresent()) a.setWard(r.ward().trim());
        if(r.addressLinePresent()) a.setAddressLine(r.address_line().trim());
    }
    private static String legacyText(Address a) {
        return String.join(", ",a.getAddressLine(),a.getWard(),a.getDistrict(),a.getProvince());
    }
    public static AddressDto toDto(Address a) {
        return new AddressDto(a.getId(),a.getRecipientName(),a.getRecipientPhone(),a.getProvince(),
                a.getDistrict(),a.getWard(),a.getAddressLine(),a.isDefault());
    }
}
