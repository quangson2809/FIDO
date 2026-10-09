package com.fido.modules.order.repository;
import com.fido.modules.order.entity.CheckoutQuote;
import java.util.Optional;
import org.springframework.data.repository.Repository;
public interface CheckoutQuoteRepository extends Repository<CheckoutQuote,String> {
    CheckoutQuote save(CheckoutQuote quote);
    Optional<CheckoutQuote> findByQuoteIdAndAccountId(String quoteId,Long accountId);
}
