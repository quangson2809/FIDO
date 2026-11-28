package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Otp;

import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class OtpStorageService {
    private final Map<String, Otp> otpStorage = new HashMap<>();

    // Các thao tác Map thực hiện lần lượt để một mã chỉ được dùng thành công một lần.
    public synchronized void storeOtp(Otp otp) {
        otpStorage.put(otp.getEmail(), otp);
    }

    public synchronized Otp getOtp(String email) {
        return otpStorage.get(email);
    }

    public synchronized boolean removeOtp(String email, Otp expected) {
        return otpStorage.remove(email, expected);
    }
}
