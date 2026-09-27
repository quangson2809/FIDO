package com.fido.modules.account.service;
import com.fido.common.response.ApiListResponse;
import com.fido.common.response.Pagination;
import com.fido.modules.account.dto.response.AddressDto;
import com.fido.modules.account.dto.response.CustomerDetailDto;
import com.fido.modules.account.dto.response.CustomerSummaryDto;
import com.fido.modules.account.mapper.AccountMapper;
import com.fido.modules.account.repository.AccountRepository;
import com.fido.modules.account.repository.AddressRepository;
import com.fido.modules.order.dto.response.CustomerOrderStats;
import com.fido.modules.order.service.CustomerOrderQueryService;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
@PreAuthorize("hasAnyAuthority('ROLE_SUPERADMIN','PERMISSION_CUSTOMER_READ')")
public class CustomerQueryService {
    private final AccountRepository accounts;
    private final AddressRepository addresses;
    private final CustomerOrderQueryService orders;
    public CustomerQueryService(AccountRepository accounts, AddressRepository addresses,
            CustomerOrderQueryService orders) {
        this.accounts = accounts;
        this.addresses = addresses;
        this.orders = orders;
    }
    public ApiListResponse<CustomerSummaryDto> list(String query, Integer page, Integer pageSize) {
        Pagination pagination = Pagination.of(page, pageSize);
        String q = query == null || query.isBlank() ? null : query.trim();
        var result = accounts.findCustomers(q, pagination.toPageable());
        var ids = result.getContent().stream().map(a -> a.getAccountId()).toList();
        var stats = orders.stats(ids).stream().collect(Collectors.toMap(CustomerOrderStats::accountId, Function.identity()));
        var data = result.getContent().stream().map(account -> {
            var stat = stats.get(account.getAccountId());
            return new CustomerSummaryDto(account.getAccountId(), account.getPhone(), account.getEmail(),
                    stat == null ? 0 : stat.orderCount(), stat == null ? null : stat.lastOrderAt());
        }).toList();
        return ApiListResponse.of(data, pagination.meta(result.getTotalElements()));
    }
    public CustomerDetailDto detail(Long id) {
        var account = accounts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var addressDtos = addresses.findByAccountIdOrderByAddressIdAsc(id).stream()
                .map(a -> new AddressDto(a.getAddressId(), a.getAddressText(), a.getCreatedAt())).toList();
        return new CustomerDetailDto(AccountMapper.account(account), addressDtos, orders.summaries(id));
    }
}
