package com.fido.modules.order.service;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class OrderPolicyTests {
    @Test
    void returnWindowIncludesExactlyTwoDaysAndRejectsInvalidTimestamps() {
        var completed = LocalDateTime.of(2026, 10, 1, 12, 0);
        assertDoesNotThrow(() -> OrderPolicy.requireReturnWithinWindow(completed, completed));
        assertDoesNotThrow(() -> OrderPolicy.requireReturnWithinWindow(completed, completed.plusDays(2)));
        assertThrows(ResponseStatusException.class, () -> OrderPolicy.requireReturnWithinWindow(completed, completed.plusDays(2).plusNanos(1)));
        assertThrows(ResponseStatusException.class, () -> OrderPolicy.requireReturnWithinWindow(null, completed));
        assertThrows(ResponseStatusException.class, () -> OrderPolicy.requireReturnWithinWindow(completed, completed.minusSeconds(1)));
    }
}
