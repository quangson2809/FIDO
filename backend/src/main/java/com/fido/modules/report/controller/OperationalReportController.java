package com.fido.modules.report.controller;

import com.fido.common.response.*;
import com.fido.modules.report.dto.response.OperationalReportDto;
import com.fido.modules.report.repository.OperationalReportRepository;
import com.fido.modules.report.service.OperationalReportService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/admin/reports/operations")
public class OperationalReportController {
    private final OperationalReportService service;

    public OperationalReportController(OperationalReportService service) {
        this.service = service;
    }

    @GetMapping
    public ApiResponse<OperationalReportDto> overview(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.of(service.overview(from, to));
    }

    @GetMapping("/orders")
    public ApiListResponse<OperationalReportRepository.OrderRow> orders(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return service.orders(from, to, status, page, pageSize);
    }

    @GetMapping("/slow-moving")
    public ApiListResponse<OperationalReportRepository.SlowProduct> slow(
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false) Integer pageSize) {
        return service.slowMoving(page, pageSize);
    }
}
