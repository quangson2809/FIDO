package com.fido.modules.inventory.controller;

import com.fido.common.response.ApiListResponse;
import com.fido.common.response.ApiResponse;
import com.fido.modules.inventory.dto.request.InventoryAdjustmentRequest;
import com.fido.modules.inventory.dto.response.InventoryRowDto;
import com.fido.modules.inventory.dto.response.InventoryTransactionDto;
import com.fido.modules.inventory.service.InventoryAdminService;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/inventory")
public class InventoryController {

    private final InventoryAdminService service;

    public InventoryController(
            InventoryAdminService service
    ) {
        this.service = service;
    }

    @GetMapping
    public ApiListResponse<InventoryRowDto> inventory(
            @RequestParam(name = "variant_id", required = false)
                    Long variantId,
            @RequestParam(required = false) String sku,
            @RequestParam(name = "product_id", required = false)
                    Long productId,
            @RequestParam(name = "size_value_id", required = false)
                    Long sizeValueId,
            @RequestParam(name = "color_id", required = false)
                    Long colorId,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return service.inventory(
                variantId,
                sku,
                productId,
                sizeValueId,
                colorId,
                page,
                pageSize
        );
    }

    @PostMapping("/adjustments")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<InventoryTransactionDto> adjust(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody InventoryAdjustmentRequest request
    ) {
        return ApiResponse.of(
                service.adjust(
                        actor(jwt),
                        request
                )
        );
    }

    @GetMapping("/transactions")
    public ApiListResponse<InventoryTransactionDto> transactions(
            @RequestParam(name = "variant_id", required = false)
                    Long variantId,
            @RequestParam(name = "transaction_type", required = false)
                    String transactionType,
            @RequestParam(name = "order_id", required = false)
                    Long orderId,
            @RequestParam(name = "goods_receipt_id", required = false)
                    Long goodsReceiptId,
            @RequestParam(name = "actor_account_id", required = false)
                    Long actorAccountId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                    LocalDateTime to,
            @RequestParam(required = false) Integer page,
            @RequestParam(name = "page_size", required = false)
                    Integer pageSize
    ) {
        return service.transactions(
                variantId,
                transactionType,
                orderId,
                goodsReceiptId,
                actorAccountId,
                from,
                to,
                page,
                pageSize
        );
    }

    private Long actor(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
