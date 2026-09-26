package com.fido.modules.product;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class CatalogPhase3HttpTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    final HttpClient client=HttpClient.newHttpClient();
    static final String PASSWORD="Test-password-123";

    final List<Long> accounts=new ArrayList<>();
    final List<Long> customRoles=new ArrayList<>();
    final Set<Long> createdPermissions=new HashSet<>();
    final List<Long> products=new ArrayList<>();
    final List<Long> categories=new ArrayList<>();
    final List<Long> brands=new ArrayList<>();
    final List<Long> systems=new ArrayList<>();
    final List<Long> colors=new ArrayList<>();

    record Result(int status,JsonNode data,String body){}
    record Employee(long id,String token){}

    Result call(String method,String path,String token,Object body)throws Exception{
        var b=HttpRequest.newBuilder(URI.create("http://localhost:"+port+path))
                .header("Accept","application/json").header("Content-Type","application/json");
        if(token!=null)b.header("Authorization","Bearer "+token);
        b.method(method,body==null?HttpRequest.BodyPublishers.noBody():
                HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var r=client.send(b.build(),HttpResponse.BodyHandlers.ofString());
        return new Result(r.statusCode(),r.body().isBlank()?null:json.readTree(r.body()),r.body());
    }

    String phone(){return "08"+UUID.randomUUID().toString().replace("-","").substring(0,16);}
    long register(String phone)throws Exception{
        var r=call("POST","/api/v1/auth/register",null,Map.of("phone",phone,"password",PASSWORD));
        assertEquals(201,r.status,r.body);
        long id=r.data.get("data").get("account_id").asLong();
        accounts.add(id);
        return id;
    }
    String login(String phone)throws Exception{
        var r=call("POST","/api/v1/auth/login",null,Map.of("identifier",phone,"password",PASSWORD));
        assertEquals(200,r.status,r.body);
        return r.data.get("data").get("access_token").asText();
    }
    void grantRole(long accountId,String code){
        db.update("INSERT INTO account_roles SELECT ?,role_id FROM roles WHERE code=?",accountId,code);
    }
    String root()throws Exception{
        String p=phone();long id=register(p);grantRole(id,"SUPERADMIN");return login(p);
    }
    long ensurePermission(String code){
        var found=db.query("SELECT permission_id FROM permissions WHERE code=?",(rs,n)->rs.getLong(1),code);
        if(!found.isEmpty())return found.get(0);
        db.update("INSERT INTO permissions(code,name) VALUES (?,?)",code,code);
        long id=db.queryForObject("SELECT permission_id FROM permissions WHERE code=?",Long.class,code);
        createdPermissions.add(id);
        return id;
    }
    long customRole(long permissionId){
        String code="catalog-test-"+UUID.randomUUID();
        db.update("INSERT INTO roles(code,name) VALUES (?,?)",code,"Catalog test");
        long role=db.queryForObject("SELECT role_id FROM roles WHERE code=?",Long.class,code);
        customRoles.add(role);
        db.update("INSERT INTO role_permissions(role_id,permission_id) VALUES (?,?)",role,permissionId);
        return role;
    }
    Employee employee(long roleId)throws Exception{
        String p=phone();long id=register(p);grantRole(id,"ADMIN");
        db.update("INSERT INTO account_roles(account_id,role_id) VALUES (?,?)",id,roleId);
        return new Employee(id,login(p));
    }

    @AfterEach void clean(){
        for(Long id:accounts) db.update("DELETE FROM audit_logs WHERE actor_account_id=?",id);
        for(Long id:products){
            db.update("DELETE FROM inventories WHERE variant_id IN (SELECT variant_id FROM product_variants WHERE product_id=?)",id);
            db.update("DELETE FROM product_images WHERE product_id=?",id);
            db.update("DELETE FROM product_variants WHERE product_id=?",id);
            db.update("DELETE FROM products WHERE product_id=?",id);
        }
        for(Long id:colors) db.update("DELETE FROM colors WHERE color_id=?",id);
        for(Long id:systems){
            db.update("DELETE FROM size_values WHERE size_system_id=?",id);
            db.update("DELETE FROM size_systems WHERE size_system_id=?",id);
        }
        for(Long id:brands) db.update("DELETE FROM brands WHERE brand_id=?",id);
        var categoryCopy=new ArrayList<>(categories);
        Collections.reverse(categoryCopy);
        for(Long id:categoryCopy) db.update("DELETE FROM categories WHERE category_id=?",id);
        for(Long id:accounts) db.update("DELETE FROM account_roles WHERE account_id=?",id);
        for(Long id:customRoles){
            db.update("DELETE FROM role_permissions WHERE role_id=?",id);
            db.update("DELETE FROM roles WHERE role_id=?",id);
        }
        for(Long id:createdPermissions) db.update("DELETE FROM permissions WHERE permission_id=?",id);
        for(Long id:accounts) db.update("DELETE FROM accounts WHERE account_id=?",id);
    }

    @Test void catalogVerticalSliceEnforcesAuthorizationAndInvariants()throws Exception{
        String rootToken=root();
        long readPermission=ensurePermission("CATALOG_READ");
        long writePermission=ensurePermission("CATALOG_WRITE");
        Employee reader=employee(customRole(readPermission));
        Employee writer=employee(customRole(writePermission));

        String plainPhone=phone();long plainId=register(plainPhone);grantRole(plainId,"ADMIN");String plainToken=login(plainPhone);

        assertEquals(403,call("GET","/api/v1/admin/products",plainToken,null).status);
        assertEquals(200,call("GET","/api/v1/admin/products",reader.token(),null).status);
        assertEquals(403,call("POST","/api/v1/admin/brands",reader.token(),Map.of("name","Denied")).status);
        assertEquals(200,call("GET","/api/v1/admin/catalog/meta",rootToken,null).status);

        var categoryResponse=call("POST","/api/v1/admin/categories",writer.token(),Map.of("name","Root "+UUID.randomUUID()));
        assertEquals(201,categoryResponse.status,categoryResponse.body);
        long category=categoryResponse.data.get("data").get("category_id").asLong();categories.add(category);

        var brandResponse=call("POST","/api/v1/admin/brands",writer.token(),Map.of("name","Brand "+UUID.randomUUID()));
        assertEquals(201,brandResponse.status,brandResponse.body);
        long brandId=brandResponse.data.get("data").get("brand_id").asLong();brands.add(brandId);
        assertEquals(200,call("PATCH","/api/v1/admin/brands/"+brandId,writer.token(),
                Map.of("name","Brand updated "+UUID.randomUUID())).status);

        var systemResponse=call("POST","/api/v1/admin/size-systems",writer.token(),Map.of(
                "code","SZ-"+UUID.randomUUID(),"name","Size system",
                "size_values",List.of(
                        Map.of("code","M","display_name","Medium","sort_order",1),
                        Map.of("code","L","display_name","Large","sort_order",2))));
        assertEquals(201,systemResponse.status,systemResponse.body);
        long systemId=systemResponse.data.get("data").get("size_system_id").asLong();systems.add(systemId);
        long sizeM=systemResponse.data.get("data").get("size_values").get(0).get("size_value_id").asLong();

        var colorResponse=call("POST","/api/v1/admin/colors",writer.token(),
                Map.of("code","C-"+UUID.randomUUID(),"name","Green"));
        assertEquals(201,colorResponse.status,colorResponse.body);
        long colorId=colorResponse.data.get("data").get("color_id").asLong();colors.add(colorId);

        var create=call("POST","/api/v1/admin/products",writer.token(),Map.of(
                "category_id",category,"brand_id",brandId,"size_system_id",systemId,"name","FIDO Shirt",
                "base_price",100000,"sale_status","ON_SALE","gender","unisex",
                "images",List.of(Map.of("image_url","https://example.test/shirt.png","alt_text","shirt")),
                "variants",List.of(Map.of("size_value_id",sizeM,"color_id",colorId,
                        "sku","SKU-"+UUID.randomUUID(),"override_price",90000,"sale_status","ON_SALE"))));
        assertEquals(201,create.status,create.body);
        long product=create.data.get("data").get("product_id").asLong();products.add(product);
        long variant=create.data.get("data").get("variants").get(0).get("variant_id").asLong();

        assertEquals(200,call("PATCH","/api/v1/admin/products/"+product,writer.token(),
                Map.of("material_care","Wash cold")).status);
        assertEquals(403,call("GET","/api/v1/admin/products/"+product,writer.token(),null).status);
        assertEquals(200,call("GET","/api/v1/admin/products/"+product,reader.token(),null).status);

        db.update("INSERT INTO inventories(variant_id,available_quantity,updated_at) VALUES (?,?,CURRENT_TIMESTAMP)",variant,5);

        var list=call("GET","/api/v1/catalog/products?q=FIDO&min_price=85000&max_price=95000&size_value_id="
                +sizeM+"&color_id="+colorId,null,null);
        assertEquals(200,list.status,list.body);
        assertEquals(1,list.data.get("meta").get("total").asInt());

        var detail=call("GET","/api/v1/catalog/products/"+product,null,null);
        assertEquals(200,detail.status,detail.body);
        assertEquals(90000,detail.data.get("data").get("variants").get(0).get("effective_price").asInt());
        assertEquals(5,detail.data.get("data").get("variants").get(0).get("available_quantity").asInt());
        assertEquals(200,call("GET","/api/v1/catalog/meta",null,null).status);
        assertEquals(200,call("GET","/api/v1/admin/catalog/meta",reader.token(),null).status);
        assertEquals(200,call("GET","/api/v1/admin/products?sale_status=ON_SALE&page_size=20",reader.token(),null).status);
        assertEquals(400,call("GET","/api/v1/admin/products?page_size=101",reader.token(),null).status);

        // A Category containing a Product cannot gain a child and cease to be a leaf.
        assertEquals(409,call("POST","/api/v1/admin/categories",writer.token(),
                Map.of("parent_category_id",category,"name","Illegal child")).status);

        // Empty Category tree still rejects cycles.
        var a=call("POST","/api/v1/admin/categories",writer.token(),Map.of("name","A "+UUID.randomUUID()));
        long aId=a.data.get("data").get("category_id").asLong();categories.add(aId);
        var b=call("POST","/api/v1/admin/categories",writer.token(),
                Map.of("parent_category_id",aId,"name","B "+UUID.randomUUID()));
        long bId=b.data.get("data").get("category_id").asLong();categories.add(bId);
        assertEquals(409,call("PATCH","/api/v1/admin/categories/"+aId,writer.token(),
                Map.of("parent_category_id",bId)).status);

        // Variant must use the Product SizeSystem and a unique size/color combination.
        var otherSystem=call("POST","/api/v1/admin/size-systems",writer.token(),Map.of(
                "code","SZ-"+UUID.randomUUID(),"name","Other",
                "size_values",List.of(Map.of("code","X","display_name","X","sort_order",1))));
        assertEquals(201,otherSystem.status,otherSystem.body);
        long otherSystemId=otherSystem.data.get("data").get("size_system_id").asLong();systems.add(otherSystemId);
        long wrongSize=otherSystem.data.get("data").get("size_values").get(0).get("size_value_id").asLong();

        assertEquals(409,call("POST","/api/v1/admin/products/"+product+"/variants",writer.token(),
                Map.of("variants",List.of(Map.of("size_value_id",wrongSize,"color_id",colorId,"sale_status","ON_SALE")))).status);
        assertEquals(409,call("POST","/api/v1/admin/products/"+product+"/variants",writer.token(),
                Map.of("variants",List.of(Map.of("size_value_id",sizeM,"color_id",colorId,"sale_status","ON_SALE")))).status);

        // Referenced master meaning cannot be repurposed or removed.
        assertEquals(409,call("PATCH","/api/v1/admin/colors/"+colorId,writer.token(),
                Map.of("name","Different meaning")).status);
        assertEquals(409,call("DELETE","/api/v1/admin/colors/"+colorId,writer.token(),null).status);
        assertEquals(409,call("PATCH","/api/v1/admin/size-systems/"+systemId,writer.token(),
                Map.of("size_values",List.of())).status);

        // STOPPED and zero stock remain separate concepts.
        assertEquals(200,call("PATCH","/api/v1/admin/products/"+product+"/variants/"+variant,writer.token(),
                Map.of("sale_status","STOPPED")).status);
        var stoppedList=call("GET","/api/v1/catalog/products?q=FIDO",null,null);
        assertEquals(0,stoppedList.data.get("meta").get("total").asInt());
        var stoppedDetail=call("GET","/api/v1/catalog/products/"+product,null,null);
        assertEquals("STOPPED",stoppedDetail.data.get("data").get("variants").get(0).get("sale_status").asText());
        assertEquals(5,stoppedDetail.data.get("data").get("variants").get(0).get("available_quantity").asInt());

        assertTrue(db.queryForObject(
                "SELECT COUNT(*) FROM audit_logs WHERE actor_account_id=? AND (action LIKE 'PRODUCT_%' OR action LIKE 'VARIANT_%')",
                Integer.class,writer.id())>0);

        // Unreferenced masters can be deleted.
        var spareColor=call("POST","/api/v1/admin/colors",writer.token(),
                Map.of("code","SP-"+UUID.randomUUID(),"name","Spare"));
        long spareColorId=spareColor.data.get("data").get("color_id").asLong();colors.add(spareColorId);
        assertEquals(204,call("DELETE","/api/v1/admin/colors/"+spareColorId,writer.token(),null).status);
        colors.remove(spareColorId);

        var spareBrand=call("POST","/api/v1/admin/brands",writer.token(),Map.of("name","Spare "+UUID.randomUUID()));
        long spareBrandId=spareBrand.data.get("data").get("brand_id").asLong();brands.add(spareBrandId);
        assertEquals(204,call("DELETE","/api/v1/admin/brands/"+spareBrandId,writer.token(),null).status);
        brands.remove(spareBrandId);
    }
}
