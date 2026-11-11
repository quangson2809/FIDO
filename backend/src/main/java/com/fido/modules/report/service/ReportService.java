package com.fido.modules.report.service;

import com.fido.modules.order.service.OrderPolicy;
import com.fido.modules.report.dto.request.ReportGranularity;
import com.fido.modules.report.dto.response.*;
import com.fido.modules.report.repository.ReportRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN', 'PERMISSION_REPORT_READ')")
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReportService {
    private final ReportRepository reports;

    public ReportService(ReportRepository reports) {
        this.reports = reports;
    }

    public ReportOverviewDto overview(LocalDate from, LocalDate to) {
        var range = ReportRange.of(from, to);
        var sales = reports.sales(range.startUtc(), range.endUtc());
        var counts = emptyStatusCounts();
        counts.putAll(reports.countsByStatus(range.startUtc(), range.endUtc()));
        return new ReportOverviewDto(
                from,
                to,
                sales.completed(),
                sales.returned(),
                netSales(sales.completed(), sales.returned()),
                counts);
    }

    public SalesTrendDto salesTrend(LocalDate from, LocalDate to, ReportGranularity granularity) {
        var range = ReportRange.of(from, to);
        var buckets =
                periods(range, granularity, new ReportRepository.SalesTotals(0L, 0L));
        for (var daily : reports.dailySales(range.startUtc(), range.endUtc())) {
            var period = granularity.periodStart(daily.date());
            var previous = buckets.get(period);
            buckets.put(
                    period,
                    new ReportRepository.SalesTotals(
                            addVnd(previous.completed(), daily.completed()),
                            addVnd(previous.returned(), daily.returned())));
        }
        var points =
                buckets.entrySet().stream()
                        .map(
                                entry ->
                                        new SalesTrendDto.Point(
                                                entry.getKey(),
                                                entry.getValue().completed(),
                                                entry.getValue().returned(),
                                                netSales(
                                                        entry.getValue().completed(),
                                                        entry.getValue().returned())))
                        .toList();
        return new SalesTrendDto(from, to, granularity, ReportRange.TIMEZONE, points);
    }

    public OrdersTrendDto ordersTrend(LocalDate from, LocalDate to, ReportGranularity granularity) {
        var range = ReportRange.of(from, to);
        Map<LocalDate, Map<String, Long>> buckets = new LinkedHashMap<>();
        periods(range, granularity, 0L)
                .keySet()
                .forEach(period -> buckets.put(period, emptyStatusCounts()));
        for (var daily : reports.dailyOrders(range.startUtc(), range.endUtc())) {
            var period = granularity.periodStart(daily.date());
            var statusCounts = buckets.get(period);
            if (statusCounts != null && statusCounts.containsKey(daily.status())) {
                statusCounts.merge(daily.status(), daily.count(), Long::sum);
            }
        }
        var points =
                buckets.entrySet().stream()
                        .map(
                                entry ->
                                        new OrdersTrendDto.Point(
                                                entry.getKey(),
                                                entry.getValue().values().stream()
                                                        .mapToLong(Long::longValue)
                                                        .sum(),
                                                entry.getValue()))
                        .toList();
        return new OrdersTrendDto(from, to, granularity, ReportRange.TIMEZONE, points);
    }

    public ProductPerformanceDto productPerformance(LocalDate from, LocalDate to, int limit) {
        var range = ReportRange.of(from, to);
        if (limit < 1 || limit > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Limit must be between 1 and 100");
        }
        return new ProductPerformanceDto(
                from, to, limit, reports.topProducts(range.startUtc(), range.endUtc(), limit));
    }

    private static long netSales(long completed, long returned) {
        try {
            long net = Math.subtractExact(completed, returned);
            if (net < 0) {
                throw new ArithmeticException("Returned adjustment exceeds completed sales");
            }
            return net;
        } catch (ArithmeticException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Report totals are inconsistent or exceed the supported integer VND range",
                    exception);
        }
    }

    private static long addVnd(long left, long right) {
        try {
            return Math.addExact(left, right);
        } catch (ArithmeticException exception) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Report totals exceed the supported integer VND range",
                    exception);
        }
    }

    private static Map<String, Long> emptyStatusCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status :
                List.of(
                        OrderPolicy.PENDING,
                        OrderPolicy.CONFIRMED,
                        OrderPolicy.PREPARING,
                        OrderPolicy.SHIPPING,
                        OrderPolicy.COMPLETED,
                        OrderPolicy.DELIVERY_FAILED,
                        OrderPolicy.CANCELLED,
                        OrderPolicy.RETURNED)) {
            counts.put(status, 0L);
        }
        return counts;
    }

    private static <T> Map<LocalDate, T> periods(
            ReportRange range, ReportGranularity granularity, T initial) {
        if (granularity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Granularity is required");
        }
        Map<LocalDate, T> periods = new LinkedHashMap<>();
        LocalDate last = granularity.periodStart(range.to());
        for (LocalDate period = granularity.periodStart(range.from());
                ;
                period = granularity.next(period)) {
            periods.put(period, initial);
            if (period.equals(last)) break;
        }
        return periods;
    }
}
