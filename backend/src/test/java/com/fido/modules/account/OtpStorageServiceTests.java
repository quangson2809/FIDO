package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.modules.account.entity.Otp;
import com.fido.modules.account.service.identity.OtpStorageService;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

class OtpStorageServiceTests {
    @Test
    void concurrentConsumersCanRemoveTheSameOtpOnlyOnce() throws Exception {
        var storage = new OtpStorageService();
        var otp = new Otp(1, "owner@example.test", "012345", Instant.now().plusSeconds(120));
        storage.storeOtp(otp);
        var start = new CountDownLatch(1);
        var threads = Executors.newFixedThreadPool(2);
        try {
            var first = threads.submit(() -> {
                start.await();
                return storage.removeOtp(otp.email(), otp);
            });
            var second = threads.submit(() -> {
                start.await();
                return storage.removeOtp(otp.email(), otp);
            });
            start.countDown();
            assertNotEquals(first.get(5, TimeUnit.SECONDS), second.get(5, TimeUnit.SECONDS));
            assertNull(storage.getOtp(otp.email()));
        } finally {
            threads.shutdownNow();
        }
    }
}
