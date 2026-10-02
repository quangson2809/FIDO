package com.fido;
import static org.junit.jupiter.api.Assertions.assertEquals;
import com.fido.config.devseed.DevDataSeedService;
import java.net.URI;import java.net.http.*;import java.nio.file.*;import java.util.*;
import org.junit.jupiter.api.Test;import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;import tools.jackson.databind.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT) @ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named="API_MATRIX_PROBE",matches="true")
class ApiMatrixExecutionProbeTest{
 static final List<Integer> O=List.of(2,3,8,9,11,12,13,14,19,21,22,27,28,33,46,47,50,51,55,57,58,59,62,66,70,71,72,73,76,77,1,4,5,6,7,10,15,17,16,20,18,23,24,25,26,29,30,31,32,34,35,36,37,38,39,40,41,42,43,44,45,48,49,52,53,54,56,60,61,63,64,65,67,68,69,74,75);
 @LocalServerPort int p; @Autowired ObjectMapper j; @Autowired JdbcTemplate db; @Autowired DevDataSeedService seed;
 final HttpClient h=HttpClient.newHttpClient(); final Map<String,String> v=new LinkedHashMap<>(),t=new LinkedHashMap<>();
 record C(int n,String m,String u,String k,String b){} record R(int s,String b){}
 @Test void probe() throws Exception{
  seed.seed(); v.put("address_id","910001");v.put("admin_role_id",""+db.queryForObject("SELECT role_id FROM roles WHERE code='ADMIN'",Long.class));
  for(var x:Map.of("superadmin_token","0909000001","customer_token","0909000002","catalog_token","0909000003","inventory_token","0909000004","order_token","0909000005","ops_token","0909000006").entrySet())t.put(x.getKey(),login(x.getValue()));
  var cs=load(); List<Map<String,Object>> out=new ArrayList<>();
  for(int n:O){C c=cs.get(n);if(c==null){out.add(e(n,"missing case"));continue;}String u=res(c.u()),b=res(c.b());if(bad(u)||bad(b)){out.add(e(n,"unresolved: "+u+" | "+b));continue;}
   try{R r=call(c.m(),u,c.k()==null?null:t.get(c.k()),b);var z=new LinkedHashMap<String,Object>();z.put("stt",n);z.put("method",c.m());z.put("path",u);z.put("status",r.s());z.put("body",r.b());out.add(z);cap(n,r.b());if(n==16)call("PATCH","/api/v1/cart/items/981001",t.get("customer_token"),"{\"quantity\":1}");}catch(Exception ex){out.add(e(n,ex.toString()));}}
  Path f=Path.of(req("API_MATRIX_RESULT_FILE"));Files.createDirectories(f.getParent());Files.writeString(f,j.writeValueAsString(out));assertEquals(77,out.size());
 }
 String login(String ph)throws Exception{R r=call("POST","/api/v1/auth/login",null,"{\"identifier\":\""+ph+"\",\"password\":\"Fido@123\"}");if(r.s()!=200)throw new IllegalStateException(r.s()+" "+r.b());return j.readTree(r.b()).path("data").path("access_token").asText();}
 Map<Integer,C> load()throws Exception{Map<Integer,C>x=new LinkedHashMap<>();try(var s=Files.list(Path.of(req("API_MATRIX_CASES_DIR")))){for(Path f:s.sorted().toList())for(JsonNode n:j.readTree(Files.readString(f))){int q=n.path("stt").asInt();x.put(q,new C(q,n.path("method").asText(),n.path("path").asText(),n.path("tokenKey").isNull()?null:n.path("tokenKey").asText(),n.path("body").isNull()?null:n.path("body").asText()));}}return x;}
 R call(String m,String u,String tok,String b)throws Exception{var q=HttpRequest.newBuilder(URI.create("http://localhost:"+p+u)).header("Accept","application/json").header("Content-Type","application/json");if(tok!=null)q.header("Authorization","Bearer "+tok);q.method(m,b==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(b));var r=h.send(q.build(),HttpResponse.BodyHandlers.ofString());return new R(r.statusCode(),r.body());}
 void cap(int n,String b){if(b==null||b.isBlank())return;try{JsonNode d=j.readTree(b).path("data");switch(n){case 5->id("new_address_id",d,"address_id");case 15->{for(JsonNode a:d.path("items"))if(a.path("variant_id").asLong()==970003L){id("new_cart_item_id",a,"cart_item_id");break;}}case 29->id("new_product_id",d,"product_id");case 31->{if(d.isArray()&&!d.isEmpty())id("new_variant_id",d.get(0),"variant_id");}case 34->id("new_category_id",d,"category_id");case 37->id("new_brand_id",d,"brand_id");case 40->id("new_size_system_id",d,"size_system_id");case 43->id("new_color_id",d,"color_id");case 48->id("new_supplier_id",d,"supplier_id");case 52->id("new_receipt_id",d,"receipt_id");case 60->id("new_staff_id",d.path("account"),"account_id");case 63->id("new_role_id",d,"role_id");case 67->id("new_permission_id",d,"permission_id");case 74->id("new_page_id",d,"page_id");default->{}}}catch(Exception ignored){}}
 void id(String k,JsonNode n,String f){JsonNode a=n.path(f);if(!a.isMissingNode()&&!a.isNull())v.put(k,a.asText());}
 String res(String s){if(s==null)return null;for(var e:v.entrySet())s=s.replace("{{"+e.getKey()+"}}",e.getValue());return s;}boolean bad(String s){return s!=null&&s.contains("{{");}
 Map<String,Object> e(int n,String m){var x=new LinkedHashMap<String,Object>();x.put("stt",n);x.put("status",null);x.put("body","PROBE_ERROR: "+m);return x;}
 String req(String n){String x=System.getenv(n);if(x==null||x.isBlank())throw new IllegalStateException("missing "+n);return x;}
}
