package com.fido.modules.product.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
import com.fido.modules.product.repository.ProductAttributeValueRepository;
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
    private final ProductAttributeValueRepository values;

    public OrderProductSnapshotService(ObjectMapper json, ProductAttributeValueRepository values) {
        this.json = json;
        this.values = values;
    }

    public Map<Long, String> attributeSnapshots(Collection<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) return Map.of();
        List<Long> ids = productIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        if (ids.isEmpty()) return Map.of();

        Map<Long, List<Map<String, Object>>> byProduct = new HashMap<>();
        ids.forEach(id -> byProduct.put(id, new ArrayList<>()));
        for (var row : values.findOrderSnapshots(ids)) {
            if (row.getOptionId() == null || row.getOptionValue() == null || row.getOptionLabel() == null) {
                throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
            }
            Map<String, Object> snapshot = new LinkedHashMap<>();
            snapshot.put("attribute_id", row.getAttributeId());
            snapshot.put("attribute_code_snapshot", row.getAttributeCode());
            snapshot.put("attribute_name_snapshot", row.getAttributeName());
            snapshot.put("attribute_value_id", row.getOptionId());
            snapshot.put("option_value_snapshot", row.getOptionValue());
            snapshot.put("option_label_snapshot", row.getOptionLabel());
            byProduct.get(row.getProductId()).add(snapshot);
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
