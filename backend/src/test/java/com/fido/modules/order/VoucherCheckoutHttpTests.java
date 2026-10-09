package com.fido.modules.order;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import com.fido.modules.order.dto.request.CreateOrderRequest;
import com.fido.modules.order.service.OrderCreationService;

class VoucherCheckoutHttpTests extends OrderHttpSupport {
    @Autowired PlatformTransactionManager transactions;
    @Autowired OrderCreationService creation;
    private final List<Long> voucherIds=new ArrayList<>();

    @Override void clean() {
        super.clean();
        for (Long id:voucherIds) {
            db.update("DELETE FROM voucher_products WHERE voucher_id=?",id);
            db.update("DELETE FROM voucher_categories WHERE voucher_id=?",id);
            db.update("DELETE FROM vouchers WHERE voucher_id=?",id);
        }
    }
    Map<String,Object> policy(String code) {
        Map<String,Object> body=new HashMap<>();
        body.put("code",code); body.put("discount_type","FIXED_AMOUNT"); body.put("discount_value",10000);
        body.put("minimum_amount",0); body.put("starts_at",Instant.now().minusSeconds(60).toString());
        body.put("ends_at",Instant.now().plusSeconds(3600).toString()); body.put("scope","ALL");
        body.put("product_ids",List.of()); body.put("category_ids",List.of()); body.put("customer_limit",1); body.put("enabled",true);
        return body;
    }
    long voucher(User admin,Map<String,Object> policy) throws Exception {
        var result=call("POST","/api/v1/admin/vouchers",admin.token(),policy);
        assertEquals(201,result.status(),result.body());
        long id=result.data().get("data").get("voucher_id").asLong(); voucherIds.add(id); return id;
    }
    void add(User user,CatalogFixture item) throws Exception {
        assertEquals(200,call("POST","/api/v1/cart/items",user.token(),Map.of("variant_id",item.variantId(),"quantity",1)).status());
    }
    Map<String,Object> request(String code) {
        var body=new HashMap<String,Object>(); body.put("recipient_phone","0900000000"); body.put("recipient_address","Hanoi");
        if(code!=null) body.put("voucher_code",code); return body;
    }
    String quote(User user,String code) throws Exception {
        var result=call("POST","/api/v1/checkout/quote",user.token(),request(code));
        assertEquals(200,result.status(),result.body()); return result.data().get("data").get("quote_id").asText();
    }
    Result place(User user,String code,String quote) throws Exception {
        var body=request(code); body.put("quote_id",quote);
        var result=call("POST","/api/v1/orders",user.token(),body);
        if(result.status()==201) {
            long id=result.data().get("data").get("order_id").asLong();
            synchronized(orderIds) { if(!orderIds.contains(id)) orderIds.add(id); }
        }
        return result;
    }
    @Test void quoteConsumesNothingRetryReturnsSameOrderAndCancellationRestoresOnce() throws Exception {
        User admin=superadmin(), buyer=user(); var item=createVariant(10,100000,null);
        String code="V"+UUID.randomUUID(); var policy=policy(code); long voucher=voucher(admin,policy); add(buyer,item);
        String quote=quote(buyer,code);
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM voucher_usages WHERE voucher_id=?",Integer.class,voucher));
        var first=place(buyer,code,quote); assertEquals(201,first.status(),first.body());
        long order=first.data().get("data").get("order_id").asLong();
        assertEquals(new BigDecimal("10000.00"),db.queryForObject("SELECT discount_snapshot FROM orders WHERE order_id=?",BigDecimal.class,order));
        assertEquals(10,stock(item.variantId()));
        add(buyer,item);
        var retry=place(buyer,code,quote); assertEquals(order,retry.data().get("data").get("order_id").asLong());
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM cart_items ci JOIN carts c ON ci.cart_id=c.cart_id WHERE c.account_id=?",Integer.class,buyer.accountId()));
        assertEquals(409,call("POST","/api/v1/checkout/quote",buyer.token(),request(code)).status());
        assertEquals(200,action(admin,order,"CANCEL").status()); assertEquals(200,action(admin,order,"CANCEL").status());
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM voucher_usages WHERE voucher_id=? AND restored=TRUE",Integer.class,voucher));
        quote(buyer,code);
        policy.put("discount_value",20000);
        assertEquals(409,call("PUT","/api/v1/admin/vouchers/"+voucher,admin.token(),policy).status());
        policy.put("discount_value",10000); policy.put("enabled",false);
        assertEquals(200,call("PUT","/api/v1/admin/vouchers/"+voucher,admin.token(),policy).status());
        assertEquals(new BigDecimal("10000.00"),db.queryForObject("SELECT discount_snapshot FROM orders WHERE order_id=?",BigDecimal.class,order));
    }
    @Test void globalLastUseIsAtomicAcrossCustomersAndSameQuoteIsIdempotent() throws Exception {
        var admin=superadmin(); var a=user(); var b=user(); var item=createVariant(10,100000,null);
        String code="V"+UUID.randomUUID(); var policy=policy(code); policy.put("global_limit",1); long id=voucher(admin,policy);
        add(a,item); add(b,item); String qa=quote(a,code),qb=quote(b,code);
        ExecutorService pool=Executors.newFixedThreadPool(2); CountDownLatch start=new CountDownLatch(1);
        try {
            var fa=pool.submit(()->{start.await();return place(a,code,qa);});
            var fb=pool.submit(()->{start.await();return place(b,code,qb);}); start.countDown();
            var ra=fa.get(20,TimeUnit.SECONDS); var rb=fb.get(20,TimeUnit.SECONDS);
            assertEquals(List.of(201,409),java.util.stream.Stream.of(ra.status(),rb.status()).sorted().toList());
            assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM voucher_usages WHERE voucher_id=?",Integer.class,id));
            User winner=ra.status()==201?a:b; String q=ra.status()==201?qa:qb;
            var f1=pool.submit(()->place(winner,code,q)); var f2=pool.submit(()->place(winner,code,q));
            assertEquals(f1.get().data().get("data").get("order_id"),f2.get().data().get("data").get("order_id"));
        } finally { pool.shutdownNow(); }
    }
    @Test void stalePriceExpiredQuoteAndOtherAccountCannotPlaceOrder() throws Exception {
        var buyer=user(); var other=user(); var item=createVariant(10,100000,null); add(buyer,item);
        String q=quote(buyer,null);
        assertEquals(409,place(other,null,q).status());
        db.update("UPDATE products SET base_price=120000 WHERE product_id=?",item.productId());
        assertEquals(409,place(buyer,null,q).status());
        String next=quote(buyer,null);
        db.update("UPDATE checkout_quotes SET expires_at=? WHERE quote_id=?",java.sql.Timestamp.from(Instant.now().minusSeconds(1)),next);
        assertEquals(409,place(buyer,null,next).status());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM orders WHERE customer_account_id=?",Integer.class,buyer.accountId()));
    }
    @Test void rollbackRestoresUsageCartQuoteAndOrder() throws Exception {
        var admin=superadmin(); var buyer=user(); var item=createVariant(10,100000,null);
        String code="V"+UUID.randomUUID(); long id=voucher(admin,policy(code)); add(buyer,item); String q=quote(buyer,code);
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->new TransactionTemplate(transactions).executeWithoutResult(tx->{
            creation.create(buyer.accountId(),new CreateOrderRequest("0900000000",null,"Hanoi",code,q));
            db.update("INSERT INTO voucher_usages SELECT * FROM voucher_usages WHERE voucher_id=?",id);
        }));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM voucher_usages WHERE voucher_id=?",Integer.class,id));
        assertNull(db.queryForObject("SELECT order_id FROM checkout_quotes WHERE quote_id=?",Long.class,q));
        assertEquals(201,place(buyer,code,q).status());
    }
    @Test void adminAuthorizationValidationAndEligibilityReasons() throws Exception {
        var admin=superadmin(); var buyer=user(); var reader=employeeWithPermission("VOUCHER_READ");
        String code="V"+UUID.randomUUID(); var policy=policy(code);
        assertEquals(403,call("POST","/api/v1/admin/vouchers",buyer.token(),policy).status());
        assertEquals(403,call("POST","/api/v1/admin/vouchers",reader.token(),policy).status());
        assertEquals(200,call("GET","/api/v1/admin/vouchers",reader.token(),null).status());
        long id=voucher(admin,policy); var item=createVariant(10,100000,null); add(buyer,item);
        for(String state:List.of("future","expired","minimum","disabled")) {
            var changed=new HashMap<>(policy);
            switch(state) {
                case "future" -> changed.put("starts_at",Instant.now().plusSeconds(600).toString());
                case "expired" -> {changed.put("starts_at",Instant.now().minusSeconds(3600).toString());changed.put("ends_at",Instant.now().minusSeconds(1).toString());}
                case "minimum" -> changed.put("minimum_amount",200000);
                case "disabled" -> changed.put("enabled",false);
            }
            assertEquals(200,call("PUT","/api/v1/admin/vouchers/"+id,admin.token(),changed).status());
            var rejection=call("POST","/api/v1/checkout/quote",buyer.token(),request(code));
            assertEquals(409,rejection.status()); assertTrue(rejection.data().has("message"),rejection.body());
        }
        assertEquals(409,call("POST","/api/v1/checkout/quote",buyer.token(),request("UNKNOWN")).status());
    }
}
