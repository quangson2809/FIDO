package com.fido.modules.order.service;
import com.fido.modules.order.dto.response.CustomerOrderStats;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import com.fido.modules.order.repository.OrderRepository;
import java.util.Collection;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CUSTOMER_READ')")
public class CustomerOrderQueryService {
    private final OrderRepository orders;
    public CustomerOrderQueryService(OrderRepository orders) { this.orders = orders; }
    public List<CustomerOrderStats> stats(Collection<Long> accountIds) {
        return accountIds.isEmpty() ? List.of() : orders.customerStats(accountIds);
    }
    public List<OrderSummaryDto> summaries(Long accountId) {
        return orders.customerSummaries(accountId);
    }
}
