package com.fido.modules.account.service;
import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.entity.*;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.*;
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
    private final jakarta.persistence.EntityManager em;
    public ProfileService(AccountRepository accounts,AddressRepository addresses,AccountAccessService access,jakarta.persistence.EntityManager em) {
        this.accounts=accounts;this.addresses=addresses;this.access=access;this.em=em;
    }
    @Transactional(readOnly=true)
    public MeDto me(Long actor) {
        var detail=access.findAccess(actor).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return new MeDto(detail.account(),addresses.findByAccountIdOrderByAddressIdAsc(actor).stream()
            .map(ProfileService::addressDto).toList(),detail.roles(),detail.permissions());
    }
    public AccountDto update(Long actor,ProfilePatch request) {
        Account account=accounts.findById(actor).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        if(request.phone()!=null) {
            if(accounts.existsByPhoneAndAccountIdNot(request.phone(),actor)) throw new ResponseStatusException(HttpStatus.CONFLICT);
            account.setPhone(request.phone());
        }
        if(request.email()!=null) account.setEmail(request.email());
        accounts.save(account);em.flush();
        return AccountMapper.account(account);
    }
    public AddressDto addAddress(Long actor,AddressRequest request) {
        Address value=new Address();value.setAccountId(actor);value.setAddressText(request.address_text());
        return addressDto(addresses.save(value));
    }
    public AddressDto updateAddress(Long actor,Long id,AddressRequest request) {
        Address value=ownedAddress(actor,id);value.setAddressText(request.address_text());return addressDto(addresses.save(value));
    }
    public void deleteAddress(Long actor,Long id) { addresses.delete(ownedAddress(actor,id)); }
    private Address ownedAddress(Long actor,Long id) {
        return addresses.findByAddressIdAndAccountId(id,actor).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private static AddressDto addressDto(Address a) {return new AddressDto(a.getAddressId(),a.getAddressText(),a.getCreatedAt());}
}
