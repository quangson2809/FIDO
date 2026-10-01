package com.fido.modules.account.dto.response;
import com.fido.modules.order.dto.response.OrderSummaryDto;
import java.util.List;
public record CustomerDetailDto(AccountDto account, List<AddressDto> addresses, List<OrderSummaryDto> orders) {}
