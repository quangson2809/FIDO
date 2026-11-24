package com.fido.modules.report.service;

import com.fido.common.response.*;
import com.fido.modules.report.dto.response.OperationalReportDto;
import com.fido.modules.report.repository.OperationalReportRepository;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Service
@PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_REPORT_READ')")
@Transactional(
        readOnly = true,
        isolation = org.springframework.transaction.annotation.Isolation.REPEATABLE_READ)
public class OperationalReportService {
    private final OperationalReportRepository reports;

    public OperationalReportService(OperationalReportRepository reports) {
        this.reports = reports;
    }

    public OperationalReportDto overview(LocalDate from, LocalDate to) {
        var range = ReportRange.of(from, to);
        var totals = reports.placedTotals(range.startUtc(), range.endUtc());
        var counts = reports.statusCounts(range.startUtc(), range.endUtc());
        var rates = new LinkedHashMap<String, Integer>();
        for (String status : List.of("CANCELLED", "DELIVERY_FAILED", "RETURNED"))
            rates.put(
                    status,
                    totals.count() == 0
                            ? 0
                            : java.math.BigDecimal.valueOf(counts.getOrDefault(status, 0L))
                                    .multiply(java.math.BigDecimal.valueOf(10000))
                                    .divide(
                                            java.math.BigDecimal.valueOf(totals.count()),
                                            0,
                                            java.math.RoundingMode.HALF_UP)
                                    .intValueExact());
        long average =
                totals.count() == 0
                        ? 0
                        : totals.total()
                                .divide(
                                        java.math.BigDecimal.valueOf(totals.count()),
                                        0,
                                        java.math.RoundingMode.HALF_UP)
                                .longValueExact();
        var slow = slowWindow();
        return new OperationalReportDto(
                from,
                to,
                ReportRange.TIMEZONE,
                "CURRENT_STATUS_OF_ORDERS_PLACED_IN_PERIOD; AOV_INCLUDES_ALL_PLACED_ORDERS",
                totals.count(),
                average,
                counts,
                rates,
                slow.from(),
                slow.to(),
                reports.slowCount(slow.startUtc(), slow.endUtc()));
    }

    public ApiListResponse<OperationalReportRepository.OrderRow> orders(
            LocalDate from, LocalDate to, String status, Integer page, Integer pageSize) {
        var range = ReportRange.of(from, to);
        if (status != null
                && !Set.of(
                                "PENDING",
                                "CONFIRMED",
                                "PREPARING",
                                "SHIPPING",
                                "COMPLETED",
                                "DELIVERY_FAILED",
                                "CANCELLED",
                                "RETURNED")
                        .contains(status))
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.BAD_REQUEST, "REPORT_STATUS_INVALID");
        var p = Pagination.of(page, pageSize);
        return ApiListResponse.of(
                reports.orderRows(
                        range.startUtc(),
                        range.endUtc(),
                        status,
                        p.pageSize(),
                        (long) (p.page() - 1) * p.pageSize()),
                p.meta(reports.orderCount(range.startUtc(), range.endUtc(), status)));
    }

    public ApiListResponse<OperationalReportRepository.SlowProduct> slowMoving(
            Integer page, Integer pageSize) {
        var range = slowWindow();
        var p = Pagination.of(page, pageSize);
        return ApiListResponse.of(
                reports.slowRows(
                        range.startUtc(),
                        range.endUtc(),
                        p.pageSize(),
                        (long) (p.page() - 1) * p.pageSize()),
                p.meta(reports.slowCount(range.startUtc(), range.endUtc())));
    }

    private ReportRange slowWindow() {
        LocalDate today = LocalDate.now(ZoneId.of(ReportRange.TIMEZONE));
        return ReportRange.of(today.minusDays(9), today);
    }
}
