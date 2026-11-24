package com.fido.modules.report.dto.response;

import java.time.LocalDate;
import java.util.Map;

public record OperationalReportDto(
        LocalDate from,
        LocalDate to,
        String timezone,
        String basis,
        long placed_orders,
        long average_order_value,
        Map<String, Long> orders_by_status,
        Map<String, Integer> status_rates_bps,
        LocalDate slow_moving_from,
        LocalDate slow_moving_to,
        long slow_moving_products) {}
