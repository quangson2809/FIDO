package com.fido.modules.order.dto.response;

import java.time.LocalDateTime;

/** Hợp đồng đọc nội bộ giữa các module, không phải tài nguyên HTTP riêng. */
public record CustomerOrderStats(Long accountId, Long orderCount, LocalDateTime lastOrderAt) {}
