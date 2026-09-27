package com.fido.modules.order.dto.response;
import java.time.LocalDateTime;
/** Module read contract; not a separate HTTP resource. */
public record CustomerOrderStats(Long accountId, Long orderCount, LocalDateTime lastOrderAt) {}
