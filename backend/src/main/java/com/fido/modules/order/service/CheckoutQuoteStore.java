package com.fido.modules.order.service;
import com.fido.modules.order.entity.CheckoutQuote;
import com.fido.modules.order.repository.CheckoutQuoteRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.Comparator;
import com.fido.modules.cart.service.CheckoutCartView;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service @Transactional(propagation=Propagation.MANDATORY)
public class CheckoutQuoteStore {
    private final CheckoutQuoteRepository quotes;
    public CheckoutQuoteStore(CheckoutQuoteRepository quotes) { this.quotes=quotes; }
    CheckoutQuote save(Long accountId,String phone,String email,String address,CheckoutCalculation calculation) {
        CheckoutQuote q=new CheckoutQuote(); q.setQuoteId(UUID.randomUUID().toString()); q.setAccountId(accountId);
        q.setFingerprint(fingerprint(phone,email,address,calculation));
        q.setExpiresAt(Instant.now().plusSeconds(900)); return quotes.save(q);
    }
    // Account mutation lock serializes quote use, cart consumption and retries.
    CheckoutQuote find(Long accountId,String quoteId) {
        if (quoteId==null) return null; // Existing non-voucher clients remain compatible.
        return quotes.findByQuoteIdAndAccountId(quoteId,accountId)
                .orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"Báo giá không hợp lệ; vui lòng tính lại"));
    }
    void requireMatching(CheckoutQuote q,String phone,String email,String address,CheckoutCalculation calculation) {
        if (q==null) {
            if(calculation.voucher().voucherId()!=null)
                throw new ResponseStatusException(HttpStatus.CONFLICT,"Áp dụng voucher cần báo giá trước khi đặt hàng");
            return;
        }
        if (!Instant.now().isBefore(q.getExpiresAt()) || !q.getFingerprint().equals(fingerprint(phone,email,address,calculation)))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Báo giá đã hết hạn hoặc nội dung/giá đã thay đổi. Vui lòng tính lại và xác nhận");
    }
    private static String fingerprint(String phone,String email,String address,CheckoutCalculation c) {
        StringBuilder value=new StringBuilder();
        append(value,phone); append(value,email); append(value,address);
        append(value,c.subtotal()); append(value,c.discount()); append(value,c.shippingFee()); append(value,c.total());
        append(value,c.voucher().voucherId()); append(value,c.voucher().code());
        c.items().stream().sorted(Comparator.comparing(CheckoutCartView.Item::variantId)).forEach(i->{
            append(value,i.variantId()); append(value,i.quantity()); append(value,i.productName());
            append(value,i.thumbnail()); append(value,i.sku()); append(value,i.size()); append(value,i.color());
            append(value,i.unitPrice()); append(value,i.lineTotal());
        });
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.toString().getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private static void append(StringBuilder out,Object raw) {
        String value=raw instanceof java.math.BigDecimal n ? n.stripTrailingZeros().toPlainString() : String.valueOf(raw);
        out.append(value.length()).append(':').append(value);
    }
}
