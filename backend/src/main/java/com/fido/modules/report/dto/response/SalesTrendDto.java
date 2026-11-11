package com.fido.modules.report.dto.response;

import com.fido.modules.report.dto.request.ReportGranularity;

import java.time.LocalDate;
import java.util.List;

/** Monetary values are whole VND integers. */
public record SalesTrendDto(
        LocalDate from,
        LocalDate to,
        ReportGranularity granularity,
        String timezone,
        List<Point> points) {
    public record Point(
            LocalDate period_start,
            long completed_sales,
            long returned_adjustment,
            long net_sales) {}
}
