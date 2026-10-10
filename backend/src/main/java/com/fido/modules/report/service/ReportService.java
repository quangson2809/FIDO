package com.fido.modules.report.service;

import com.fido.modules.order.service.OrderPolicy;
import com.fido.modules.report.dto.request.ReportGranularity;
import com.fido.modules.report.dto.response.*;
import com.fido.modules.report.repository.ReportRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@PreAuthorize("hasAuthority('ROLE_SUPERADMIN') or (hasAuthority('ROLE_ADMIN') and hasAuthority('PERMISSION_REPORT_READ'))")
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
        return new ReportOverviewDto(from, to, sales.completed(), sales.returned(),
                sales.completed().subtract(sales.returned()), counts);
    }

    public SalesTrendDto salesTrend(LocalDate from, LocalDate to, ReportGranularity granularity) {
        var range = ReportRange.of(from, to);
        var buckets = periods(range, granularity, new ReportRepository.SalesTotals(BigDecimal.ZERO, BigDecimal.ZERO));
        for (var daily : reports.dailySales(range.startUtc(), range.endUtc())) {
            var period = granularity.periodStart(daily.date());
            var previous = buckets.get(period);
            buckets.put(period, new ReportRepository.SalesTotals(previous.completed().add(daily.completed()),
                    previous.returned().add(daily.returned())));
        }
        var points = buckets.entrySet().stream().map(entry -> new SalesTrendDto.Point(entry.getKey(),
                entry.getValue().completed(), entry.getValue().returned(),
                entry.getValue().completed().subtract(entry.getValue().returned()))).toList();
        return new SalesTrendDto(from, to, granularity, ReportRange.TIMEZONE, points);
    }

    public OrdersTrendDto ordersTrend(LocalDate from, LocalDate to, ReportGranularity granularity) {
        var range = ReportRange.of(from, to);
        Map<LocalDate, Map<String, Long>> buckets = new LinkedHashMap<>();
        periods(range, granularity, 0L).keySet().forEach(period -> buckets.put(period, emptyStatusCounts()));
        for (var daily : reports.dailyOrders(range.startUtc(), range.endUtc())) {
            buckets.get(granularity.periodStart(daily.date())).merge(daily.status(), daily.count(), Long::sum);
        }
        var points = buckets.entrySet().stream().map(entry -> new OrdersTrendDto.Point(entry.getKey(),
                entry.getValue().values().stream().mapToLong(Long::longValue).sum(), entry.getValue())).toList();
        return new OrdersTrendDto(from, to, granularity, ReportRange.TIMEZONE, points);
    }

    public ProductPerformanceDto productPerformance(LocalDate from, LocalDate to, int limit) {
        var range = ReportRange.of(from, to);
        if (limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Limit must be between 1 and 100");
        }
        return new ProductPerformanceDto(from, to, reports.topProducts(range.startUtc(), range.endUtc(), limit));
    }

    private static Map<String, Long> emptyStatusCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status : List.of(OrderPolicy.PENDING, OrderPolicy.CONFIRMED, OrderPolicy.PREPARING,
                OrderPolicy.SHIPPING, OrderPolicy.COMPLETED, OrderPolicy.DELIVERY_FAILED,
                OrderPolicy.CANCELLED, OrderPolicy.RETURNED)) {
            counts.put(status, 0L);
        }
        return counts;
    }

    private static <T> Map<LocalDate, T> periods(ReportRange range, ReportGranularity granularity, T initial) {
        if (granularity == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Granularity is required");
        }
        Map<LocalDate, T> periods = new LinkedHashMap<>();
        LocalDate last = granularity.periodStart(range.to());
        for (LocalDate period = granularity.periodStart(range.from()); ; period = granularity.next(period)) {
            periods.put(period, initial);
            if (period.equals(last)) break;
        }
        return periods;
    }
}
