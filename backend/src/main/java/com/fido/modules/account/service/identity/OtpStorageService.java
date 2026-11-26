package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Otp;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class OtpStorageService {
    private Map<String, Otp> otpStorage = new HashMap<>();

    public void storeOtp(String email, String otp) {
        otpStorage.put(email, new Otp(email, otp, LocalDateTime.now().plusMinutes(2)));
    }

    public Otp getOtp(String email) {
        return otpStorage.get(email);
    }

    public void removeOtp(String email) {
        otpStorage.remove(email);
    }
}
