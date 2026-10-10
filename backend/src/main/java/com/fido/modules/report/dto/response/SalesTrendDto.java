package com.fido.modules.report.dto.response;

import java.time.LocalDate;
import java.util.List;
import java.math.BigDecimal;
import com.fido.modules.report.dto.request.ReportGranularity;

public record SalesTrendDto(
        LocalDate from, LocalDate to, ReportGranularity granularity, String timezone,
        List<Point> points
) {
    public record Point(LocalDate period_start, BigDecimal completed_sales,
                        BigDecimal returned_adjustment, BigDecimal net_sales) {}
}
