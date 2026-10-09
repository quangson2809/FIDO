package com.fido.common.exception;
import com.fido.modules.order.controller.CheckoutController;
import com.fido.modules.order.controller.OrderCreationController;
import com.fido.modules.promotion.controller.VoucherAdminController;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
/** Exposes only explicitly authored checkout/promotion rejection reasons. */
@Order(0)
@RestControllerAdvice(assignableTypes={CheckoutController.class, OrderCreationController.class, VoucherAdminController.class})
public class CheckoutErrorHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,Object>> reject(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("status",error.getStatusCode().value(),
                "message",error.getReason()==null ? "Yêu cầu không phù hợp với trạng thái hiện tại" : error.getReason()));
    }
}
