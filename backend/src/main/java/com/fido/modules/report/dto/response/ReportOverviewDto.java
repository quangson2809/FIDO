package com.fido.modules.report.dto.response;

import java.time.LocalDate;
import java.util.Map;

/** Monetary values are whole VND integers. */
public record ReportOverviewDto(
        LocalDate from,
        LocalDate to,
        long completed_sales,
        long returned_adjustment,
        long net_sales,
        Map<String, Long> orders_by_status) {}
