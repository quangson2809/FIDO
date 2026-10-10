package com.fido.modules.report.service;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

record ReportRange(LocalDate from, LocalDate to, LocalDateTime startUtc, LocalDateTime endUtc) {
    static final String TIMEZONE = "Asia/Ho_Chi_Minh";
    private static final ZoneId ZONE = ZoneId.of(TIMEZONE);

    static ReportRange of(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report date range");
        }
        try {
            return new ReportRange(from, to,
                    from.atStartOfDay(ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime(),
                    to.plusDays(1).atStartOfDay(ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime());
        } catch (DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid report date range", exception);
        }
    }
}
