package com.fido.modules.order.service.action;

import com.fido.modules.order.dto.request.OrderActionRequest;
import com.fido.modules.order.entity.Order;
import com.fido.modules.order.entity.ShippingInfo;

import java.util.List;

interface OrderActionHandler {
    List<OrderAction> supportedActions();

    /**
     * actor do controller lấy từ JWT; order đã khóa và shipping lấy từ DB của cùng đơn.
     * request là lệnh quản trị đã qua policy; bên gọi giữ giao dịch và ghi audit sau khi handler hoàn
     * tất.
     */
    void execute(Long actor, Order order, ShippingInfo shipping, OrderActionRequest request);
}
