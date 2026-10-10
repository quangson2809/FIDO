package com.fido.modules.report.dto.response;

import java.time.LocalDate;
import java.util.List;


public record ProductPerformanceDto(
        LocalDate from, LocalDate to, List<Item> items
) {
    public record Item(long product_id, String product_name, String thumbnail,
                       long completed_units, long returned_units, long net_units) {}
}
