package com.fido.modules.report.controller;

import com.fido.common.response.ApiResponse;
import com.fido.modules.report.dto.response.*;
import com.fido.modules.report.dto.request.ReportGranularity;
import com.fido.modules.report.service.ReportService;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    @GetMapping("/overview")
    public ApiResponse<ReportOverviewDto> overview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.of(service.overview(from, to));
    }

    @GetMapping("/sales-trend")
    public ApiResponse<SalesTrendDto> salesTrend(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAY") ReportGranularity granularity
    ) {
        return ApiResponse.of(service.salesTrend(from, to, granularity));
    }

    @GetMapping("/orders-trend")
    public ApiResponse<OrdersTrendDto> ordersTrend(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "DAY") ReportGranularity granularity
    ) {
        return ApiResponse.of(service.ordersTrend(from, to, granularity));
    }

    @GetMapping("/product-performance")
    public ApiResponse<ProductPerformanceDto> productPerformance(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ApiResponse.of(service.productPerformance(from, to, limit));
    }
}
