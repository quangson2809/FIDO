package com.fido.modules.report.dto.response;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import com.fido.modules.report.dto.request.ReportGranularity;

public record OrdersTrendDto(
        LocalDate from, LocalDate to, ReportGranularity granularity, String timezone,
        List<Point> points
) {
    public record Point(LocalDate period_start, long total_orders, Map<String, Long> orders_by_status) {}
}
