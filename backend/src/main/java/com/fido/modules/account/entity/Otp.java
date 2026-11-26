package com.fido.modules.account.entity;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class Otp {
    private String email;
    private String otp;
    private LocalDateTime expirationTime;
}
