package com.fido.modules.account.service.identity;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountMailService {
    private final ObjectProvider<JavaMailSender> senders;
    private final String from;
    private final String publicUrl;

    public AccountMailService(
            ObjectProvider<JavaMailSender> senders,
            @Value("${app.mail.from:}") String from,
            @Value("${app.public-url:}") String publicUrl) {
        this.senders = senders;
        this.from = from;
        this.publicUrl = publicUrl;
    }

    public void requireConfigured() {
        if (senders.getIfAvailable() == null || from.isBlank() || publicUrl.isBlank())
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE, "EMAIL_DELIVERY_NOT_CONFIGURED");
        var uri = java.net.URI.create(publicUrl);
        if (!"https".equals(uri.getScheme())
                && !java.util.Set.of("localhost", "127.0.0.1").contains(uri.getHost()))
            throw new IllegalStateException("Public recovery URL requires HTTPS");
    }

    public void sendLink(String email, String purpose, String token) {
        requireConfigured();
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(
                "EMAIL_VERIFY".equals(purpose)
                        ? "FIDO — Xác minh email"
                        : "FIDO — Khôi phục mật khẩu");
        // Fragment keeps the capability out of HTTP request URLs, access logs and referrers.
        message.setText(
                "Nếu bạn không yêu cầu, hãy bỏ qua thư này. Liên kết chỉ dùng một lần:\n"
                        + publicUrl.replaceAll("/+$", "")
                        + "/account-recovery#purpose="
                        + purpose
                        + "&token="
                        + token);
        senders.getObject().send(message);
    }
}
