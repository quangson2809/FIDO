package com.fido.modules.product.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class OrderProductSnapshotService {
    private final ObjectMapper json;
    @PersistenceContext private EntityManager entityManager;

    public OrderProductSnapshotService(ObjectMapper json) { this.json = json; }

    public Map<Long, String> attributeSnapshots(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        List<Long> ids = productIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();

        Map<Long, List<Map<String, Object>>> byProduct = new HashMap<>();
        ids.forEach(id -> byProduct.put(id, new ArrayList<>()));
        List<?> rows = entityManager.createNativeQuery("""
                select pav.product_id, pav.attribute_id, a.code, a.name,
                       pav.option_id, ao.`value`, ao.label
                from product_attribute_values pav
                join attributes a on a.id = pav.attribute_id
                join attribute_options ao
                    on ao.id = pav.option_id and ao.attribute_id = pav.attribute_id
                where pav.product_id in (:productIds)
                order by pav.product_id asc, a.sort_order asc, pav.attribute_id asc
                """).setParameter("productIds", ids).getResultList();

        for (Object row : rows) {
            Object[] fields = (Object[]) row;
            Long productId = ((Number) fields[0]).longValue();
            if (fields[4] == null || fields[5] == null || fields[6] == null) {
                throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
            }
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("attribute_id", ((Number) fields[1]).longValue());
            snapshot.put("attribute_code_snapshot", fields[2]);
            snapshot.put("attribute_name_snapshot", fields[3]);
            snapshot.put("attribute_value_id", ((Number) fields[4]).longValue());
            snapshot.put("option_value_snapshot", fields[5].toString());
            snapshot.put("option_label_snapshot", fields[6].toString());
            byProduct.get(productId).add(snapshot);
        }

        Map<Long, String> result = new HashMap<>();
        for (Long id : ids) {
            try {
                String snapshot = json.writeValueAsString(byProduct.get(id));
                if (snapshot.codePointCount(0, snapshot.length()) > 2000) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                            "ORDER_ATTRIBUTE_SNAPSHOT_TOO_LARGE");
                }
                result.put(id, snapshot);
            } catch (JacksonException exception) {
                throw new IllegalStateException("Could not serialize Product attribute snapshot", exception);
            }
        }
        return Map.copyOf(result);
    }
}
