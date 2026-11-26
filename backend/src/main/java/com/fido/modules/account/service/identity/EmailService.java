package com.fido.modules.account.service.identity;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmailService {
    private final JavaMailSender sender;
    private final String from;

    public EmailService(
            JavaMailSender sender, @Value("${spring.mail.username:}") String from) {
        this.sender = sender;
        this.from = from;
    }

    public void sendOtp(String email, String code) {
        if (from.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_NOT_CONFIGURED");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("FIDO - Mã xác nhận đổi mật khẩu");
        message.setText(
                """
                Xin chào,

                Mã xác nhận đổi mật khẩu của bạn là: %s

                Mã có hiệu lực trong 2 phút và chỉ dùng một lần để đổi mật khẩu.
                Vui lòng không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.

                Trân trọng,
                FIDO
                """
                        .formatted(code));

        try {
            sender.send(message);
        } catch (MailException failure) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY, "EMAIL_DELIVERY_FAILED", failure);
        }
    }
}
