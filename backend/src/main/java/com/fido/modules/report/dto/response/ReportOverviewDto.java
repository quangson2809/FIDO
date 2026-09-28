package com.fido.modules.report.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record ReportOverviewDto(
        LocalDate from,
        LocalDate to,
        BigDecimal completed_sales,
        BigDecimal returned_adjustment,
        BigDecimal net_sales,
        Map<String, Long> orders_by_status
) {
}
