package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fido.modules.account.service.identity.EmailService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.server.ResponseStatusException;

class EmailServiceTests {
    @Test
    void springMailSenderReceivesRecipientCodeAndExpiry() {
        var sender = mock(JavaMailSender.class);
        var service = new EmailService(sender, "mailer@example.test");
        service.sendOtp("owner@example.test", "012345");
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertEquals("mailer@example.test", message.getValue().getFrom());
        assertArrayEquals(new String[] {"owner@example.test"}, message.getValue().getTo());
        assertTrue(message.getValue().getText().contains("012345"));
        assertTrue(message.getValue().getText().contains("2 phút"));
    }

    @Test
    void missingConfigurationAndTransportFailureHaveSafeErrors() {
        var sender = mock(JavaMailSender.class);
        var missing = assertThrows(ResponseStatusException.class,
                () -> new EmailService(sender, "").sendOtp("owner@example.test", "012345"));
        assertEquals(503, missing.getStatusCode().value());
        verifyNoInteractions(sender);
        doThrow(new MailSendException("provider failure"))
                .when(sender).send(any(SimpleMailMessage.class));
        var failure = assertThrows(ResponseStatusException.class,
                () -> new EmailService(sender, "mailer@example.test")
                        .sendOtp("owner@example.test", "012345"));
        assertEquals(502, failure.getStatusCode().value());
        assertEquals("EMAIL_DELIVERY_FAILED", failure.getReason());
    }
}
