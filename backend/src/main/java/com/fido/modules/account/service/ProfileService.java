package com.fido.modules.account.service;

import com.fido.modules.account.dto.request.AddressRequest;
import com.fido.modules.account.dto.request.ProfilePatch;
import com.fido.modules.account.dto.response.AccountDto;
import com.fido.modules.account.dto.response.AddressDto;
import com.fido.modules.account.dto.response.MeDto;
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

@Service
@Transactional
public class ProfileService {

    private final AccountRepository accounts;
    private final AddressRepository addresses;
    private final AccountAccessService access;
    private final EntityManager entityManager;

    public ProfileService(
            AccountRepository accounts,
            AddressRepository addresses,
            AccountAccessService access,
            EntityManager entityManager
    ) {
        this.accounts = accounts;
        this.addresses = addresses;
        this.access = access;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public MeDto me(Long actor) {
        var detail = access
                .findAccess(actor)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED)
                );

        var addressDtos = addresses
                .findByAccountIdOrderByAddressIdAsc(actor)
                .stream()
                .map(ProfileService::addressDto)
                .toList();

        return new MeDto(
                detail.account(),
                addressDtos,
                detail.roles(),
                detail.permissions()
        );
    }

    public AccountDto update(Long actor, ProfilePatch request) {
        Account account = accounts
                .findById(actor)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.UNAUTHORIZED)
                );

        if (request.phone() != null) {
            if (accounts.existsByPhoneAndAccountIdNot(request.phone(), actor)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }

            account.setPhone(request.phone());
        }

        if (request.email() != null) {
            account.setEmail(request.email());
        }

        accounts.save(account);
        entityManager.flush();

        return AccountMapper.account(account);
    }

    public AddressDto addAddress(Long actor, AddressRequest request) {
        Address address = new Address();
        address.setAccountId(actor);
        address.setAddressText(request.address_text());

        return addressDto(
                addresses.save(address)
        );
    }

    public AddressDto updateAddress(
            Long actor,
            Long addressId,
            AddressRequest request
    ) {
        Address address = ownedAddress(actor, addressId);
        address.setAddressText(request.address_text());

        return addressDto(
                addresses.save(address)
        );
    }

    public void deleteAddress(Long actor, Long addressId) {
        addresses.delete(
                ownedAddress(actor, addressId)
        );
    }

    private Address ownedAddress(Long actor, Long addressId) {
        return addresses
                .findByAddressIdAndAccountId(addressId, actor)
                .orElseThrow(() ->
                        new ResponseStatusException(HttpStatus.NOT_FOUND)
                );
    }

    private static AddressDto addressDto(Address address) {
        return new AddressDto(
                address.getAddressId(),
                address.getAddressText(),
                address.getCreatedAt()
        );
    }
}
