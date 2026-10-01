package com.fido.modules.account.dto.response;

public record LoginResponse(String access_token, String token_type, long expires_in, AccountDto account) {}
