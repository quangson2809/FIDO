package com.fido.modules.report.service;

import com.fido.modules.order.service.OrderPolicy;
import com.fido.modules.report.dto.response.ReportOverviewDto;
import com.fido.modules.report.repository.ReportRepository;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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
public class ReportService {

    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final ReportRepository reports;

    public ReportService(ReportRepository reports) {
        this.reports = reports;
    }

    @PreAuthorize("hasAuthority('ROLE_SUPERADMIN')")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReportOverviewDto overview(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        LocalDateTime startUtc;
        LocalDateTime endUtc;
        try {
            startUtc = from.atStartOfDay(REPORT_ZONE)
                    .withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
            endUtc = to.plusDays(1).atStartOfDay(REPORT_ZONE)
                    .withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
        } catch (DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }

        var sales = reports.sales(startUtc, endUtc);
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status : List.of(
                OrderPolicy.PENDING, OrderPolicy.CONFIRMED, OrderPolicy.PREPARING,
                OrderPolicy.SHIPPING, OrderPolicy.COMPLETED, OrderPolicy.DELIVERY_FAILED,
                OrderPolicy.CANCELLED, OrderPolicy.RETURNED
        )) {
            counts.put(status, 0L);
        }
        counts.putAll(reports.countsByStatus(startUtc, endUtc));

        return new ReportOverviewDto(
                from, to, sales.completed(), sales.returned(),
                sales.completed().subtract(sales.returned()), counts
        );
    }
}
