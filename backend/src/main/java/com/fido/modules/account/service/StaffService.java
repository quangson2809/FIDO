package com.fido.modules.account.service;

import com.fido.common.response.*;
import com.fido.modules.account.dto.request.*;
import com.fido.modules.account.dto.response.*;
import com.fido.modules.account.entity.*;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.*;
import com.fido.modules.audit.service.AuditService;
import jakarta.persistence.EntityManager;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
public class StaffService {
    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final AccountRoleRepository assignments;
    private final AccountAccessService access;
    private final AuthenticationService authentication;
    private final AuditService audit;
    private final EntityManager em;
    public StaffService(AccountRepository accounts,RoleRepository roles,AccountRoleRepository assignments,
                        AccountAccessService access,AuthenticationService authentication,AuditService audit,EntityManager em) {
        this.accounts=accounts;this.roles=roles;this.assignments=assignments;this.access=access;
        this.authentication=authentication;this.audit=audit;this.em=em;
    }
    @Transactional(readOnly=true)
    public ApiListResponse<StaffAccountSummaryDto> list(String q,Long roleId,Integer page,Integer pageSize) {
        Pagination pagination;
        try {pagination=Pagination.of(page,pageSize);} catch(IllegalArgumentException ex) {throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
        var result=accounts.findStaff(q,roleId,pagination.toPageable());
        return ApiListResponse.of(result.getContent().stream().map(a -> new StaffAccountSummaryDto(AccountMapper.account(a),
            roles.findAssignedToAccount(a.getAccountId()).stream().map(AccountMapper::role).toList())).toList(),pagination.meta(result.getTotalElements()));
    }
    @Transactional(readOnly=true)
    public StaffAccountDetailDto detail(Long id) {requireStaff(id);return access.findAccess(id).orElseThrow();}
    public StaffAccountDetailDto create(Long actor,StaffCreateRequest request) {
        lock();if(accounts.existsByPhone(request.phone())) throw new ResponseStatusException(HttpStatus.CONFLICT);
        var ids=request.role_ids()==null ? List.of(roles.findByCode("ADMIN").orElseThrow().getRoleId()) : request.role_ids();
        var resolved=resolve(ids);
        if(resolved.stream().noneMatch(r -> Set.of("ADMIN","SUPERADMIN").contains(r.getCode())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        Account account=new Account();account.setPhone(request.phone());account.setEmail(request.email());
        account.setPasswordHash(authentication.hashPassword(request.password()));accounts.save(account);
        replace(account.getAccountId(),resolved);em.flush();audit.record(actor,"STAFF_CREATE","ACCOUNT",account.getAccountId());
        return access.findAccess(account.getAccountId()).orElseThrow();
    }
    public StaffAccountDetailDto update(Long actor,Long id,StaffPatchRequest request) {
        Role highest=lock();requireStaff(id);Account account=accounts.findById(id).orElseThrow();
        if(request.phone()!=null) {
            if(accounts.existsByPhoneAndAccountIdNot(request.phone(),id)) throw new ResponseStatusException(HttpStatus.CONFLICT);
            account.setPhone(request.phone());
        }
        if(request.email()!=null) account.setEmail(request.email());
        if(request.role_ids()!=null) {
            var resolved=resolve(request.role_ids());
            boolean removingHighest=access.isAdministrator(id) && resolved.stream().noneMatch(r -> "SUPERADMIN".equals(r.getCode()));
            if(removingHighest && assignments.countByRoleId(highest.getRoleId())<=1) throw new ResponseStatusException(HttpStatus.CONFLICT);
            replace(id,resolved);
        }
        em.flush();audit.record(actor,"STAFF_UPDATE","ACCOUNT",id);return access.findAccess(id).orElseThrow();
    }
    private void requireStaff(Long id) {
        if(roles.findAssignedToAccount(id).stream().noneMatch(r -> Set.of("ADMIN","SUPERADMIN").contains(r.getCode())))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    private List<Role> resolve(List<Long> ids) {return new LinkedHashSet<>(ids).stream().map(id -> roles.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND))).toList();}
    private void replace(Long id,List<Role> selected) {
        assignments.deleteByAccountId(id);em.flush();
        for(Role role:selected) {AccountRole row=new AccountRole();row.setAccountId(id);row.setRoleId(role.getRoleId());assignments.save(row);}
    }
    private Role lock() {return roles.lockAdministration().orElseThrow();}
}
