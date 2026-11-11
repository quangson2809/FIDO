package com.fido.modules.account.service;
import com.fido.modules.account.dto.response.MeDto;
import com.fido.modules.account.repository.AddressRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
@Service
@Transactional(readOnly=true)
public class ProfileQueryService {
    private final AccountAccessService access;
    private final AddressRepository addresses;
    public ProfileQueryService(AccountAccessService access,AddressRepository addresses) {
        this.access=access; this.addresses=addresses;
    }
    public MeDto me(Long actor) {
        var detail=access.findActiveAccess(actor).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        var addressDtos=addresses.findByAccountIdOrderByIdAsc(actor).stream().map(ProfileCommandService::toDto).toList();
        return new MeDto(detail.account(),addressDtos,detail.roles(),detail.permissions());
    }
}
