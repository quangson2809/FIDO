package com.fido.modules.product.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Product-owned read adapter that freezes dynamic attribute values at Order placement. */
@Service
@Transactional(readOnly = true)
public class OrderProductSnapshotService {
    private final ObjectMapper json;

    @PersistenceContext
    private EntityManager entityManager;

    public OrderProductSnapshotService(ObjectMapper json) {
        this.json = json;
    }

    public Map<Long, String> attributeSnapshots(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return Map.of();
        }

        List<Long> ids = productIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) {
            return Map.of();
        }

        Map<Long, List<Map<String, Object>>> byProduct = new HashMap<>();
        ids.forEach(id -> byProduct.put(id, new ArrayList<>()));

        List<?> rows = entityManager.createNativeQuery("""
                select pav.product_id, pav.attribute_id, a.code, a.name, at.data_type,
                       ao.\u0060value\u0060, ao.label, pav.text_value, pav.number_value, pav.boolean_value
                from product_attribute_values pav
                join attributes a on a.id = pav.attribute_id
                join attribute_types at on at.id = a.attribute_type_id
                left join attribute_options ao
                    on ao.id = pav.option_id and ao.attribute_id = pav.attribute_id
                where pav.product_id in (:productIds)
                order by pav.product_id asc, a.sort_order asc, pav.attribute_id asc
                """)
                .setParameter("productIds", ids)
                .getResultList();

        for (Object row : rows) {
            Object[] fields = (Object[]) row;
            Long productId = ((Number) fields[0]).longValue();
            String dataType = String.valueOf(fields[4]);
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("attribute_id", ((Number) fields[1]).longValue());
            snapshot.put("attribute_code_snapshot", fields[2]);
            snapshot.put("attribute_name_snapshot", fields[3]);
            snapshot.put("data_type", dataType);

            switch (dataType) {
                case "OPTION" -> {
                    if (fields[5] == null || fields[6] == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    snapshot.put("option_value_snapshot", fields[5].toString());
                    snapshot.put("option_label_snapshot", fields[6].toString());
                }
                case "TEXT" -> snapshot.put("text_value_snapshot", fields[7]);
                case "NUMBER" -> {
                    if (fields[8] == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    BigDecimal number = fields[8] instanceof BigDecimal decimal
                            ? decimal : new BigDecimal(fields[8].toString());
                    snapshot.put("number_value_snapshot", number.stripTrailingZeros().toPlainString());
                }
                case "BOOLEAN" -> {
                    if (fields[9] == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    Object booleanValue = fields[9];
                    boolean value = booleanValue instanceof Boolean bool
                            ? bool : ((Number) booleanValue).intValue() != 0;
                    snapshot.put("boolean_value_snapshot", value);
                }
                default -> throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
            }
            byProduct.get(productId).add(snapshot);
        }

        Map<Long, String> result = new HashMap<>();
        for (Long id : ids) {
            try {
                String snapshot = json.writeValueAsString(byProduct.get(id));
                if (snapshot.codePointCount(0, snapshot.length()) > 2000) {
                    throw new ResponseStatusException(
                            HttpStatus.UNPROCESSABLE_ENTITY, "ORDER_ATTRIBUTE_SNAPSHOT_TOO_LARGE");
                }
                result.put(id, snapshot);
            } catch (JsonProcessingException exception) {
                throw new IllegalStateException("Could not serialize Product attribute snapshot", exception);
            }
        }
        return Map.copyOf(result);
    }
}
