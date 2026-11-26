package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Otp;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class OtpStorageService {
    private final ConcurrentMap<String, Otp> otpStorage = new ConcurrentHashMap<>();

    public void storeOtp(Otp otp) {
        otpStorage.entrySet().removeIf(entry -> entry.getValue().isExpired(Instant.now()));
        otpStorage.put(otp.email(), otp);
    }

    public Otp getOtp(String email) {
        return otpStorage.get(email);
    }

    public boolean removeOtp(String email, Otp expected) {
        return otpStorage.remove(email, expected);
    }
}
