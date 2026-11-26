package com.fido.modules.account.service.identity;

import com.fido.modules.account.entity.Otp;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Random;

@Service
public class EmailService {
    private final JavaMailSender sender;
    private final OtpStorageService otpStorageService;
    private final String from;

    public EmailService(
        JavaMailSender sender,
        @Value("${spring.mail.username}") String from,
        OtpStorageService otpStorageService) {
        this.sender = sender;
        this.from = from;
        this.otpStorageService = otpStorageService;
    }

    private String generateOtpCode() {
        Random random = new Random();
        return String.format("%06d", random.nextInt(1000000)); // 6-digit OTP
    }

    public void sendOtp(String email) {
        String otp = generateOtpCode();
        otpStorageService.storeOtp(email,otp);

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(from);
        message.setTo(email);
        message.setSubject("FIDO - Xác thực email");

        message.setText("""
                Xin chào,

                Mã xác thực email của bạn là: %s

                Vui lòng không chia sẻ mã này với bất kỳ ai.

                Nếu bạn không thực hiện yêu cầu này,
                vui lòng bỏ qua email.

                Trân trọng,
                FIDO
                """.formatted(otp));

        sender.send(message);
    }

}
