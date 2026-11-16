package com.fido.modules.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record InventoryAdjustmentRequest(
        @NotNull @Positive Long product_id,
        // Lượng thay đổi có dấu: dương cộng kho, âm trừ kho; không phải số dư tồn mong muốn.
        @NotNull Integer quantity_delta,
        @NotBlank
                @Pattern(regexp = "COUNT_CORRECTION|DAMAGE|LOSS|FOUND|DATA_CORRECTION")
                @Size(max = 80) String reason_code,
        // Client giữ nguyên mã nghiệp vụ này khi gửi lại cùng điều chỉnh; khác với khóa HTTP và ID bút toán.
        @NotBlank @Pattern(regexp = "[A-Za-z0-9._:-]{1,80}") String source_operation_id,
        // Version số dư client đã đọc; gửi giá trị để phát hiện dữ liệu cũ, không gửi thì bỏ
        // kiểm tra version mong đợi.
        @Min(0) Integer expected_version) {}
