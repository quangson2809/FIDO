package com.fido.modules.account.service;

import com.fido.modules.account.repository.AccountRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** Khóa tài khoản trước khi tạo/sửa dữ liệu con để tuần tự hóa cả khi dòng con chưa tồn tại. */
@Service
@Transactional(propagation = Propagation.MANDATORY)
public class AccountMutationLockService {
    private final AccountRepository accounts;

    public AccountMutationLockService(AccountRepository accounts) {
        this.accounts = accounts;
    }

    public void lock(Long accountId) {
        accounts.findByIdForUpdate(accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
