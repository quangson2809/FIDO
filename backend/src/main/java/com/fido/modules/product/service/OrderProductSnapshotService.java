package com.fido.modules.product.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;
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

    private final ProductAttributeSnapshotRepository snapshots;

    public OrderProductSnapshotService(
            ObjectMapper json, ProductAttributeSnapshotRepository snapshots) {
        this.json = json;
        this.snapshots = snapshots;
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

        List<ProductAttributeSnapshotRepository.SnapshotRow> rows =
                snapshots.findSnapshotsByProductIds(ids);

        for (ProductAttributeSnapshotRepository.SnapshotRow row : rows) {
            Long productId = row.getProductId();
            String dataType = String.valueOf(row.getDataType());
            Map<String, Object> itemSnapshot = new LinkedHashMap<>();
            itemSnapshot.put("attribute_id", row.getAttributeId());
            itemSnapshot.put("attribute_code_snapshot", row.getAttributeCode());
            itemSnapshot.put("attribute_name_snapshot", row.getAttributeName());
            itemSnapshot.put("data_type", dataType);

            switch (dataType) {
                case "OPTION" -> {
                    if (row.getOptionValue() == null || row.getOptionLabel() == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    itemSnapshot.put("option_value_snapshot", row.getOptionValue());
                    itemSnapshot.put("option_label_snapshot", row.getOptionLabel());
                }
                case "TEXT" -> itemSnapshot.put("text_value_snapshot", row.getTextValue());
                case "NUMBER" -> {
                    if (row.getNumberValue() == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    Object rawNumber = row.getNumberValue();
                    BigDecimal number = rawNumber instanceof BigDecimal decimal
                            ? decimal : new BigDecimal(rawNumber.toString());
                    itemSnapshot.put("number_value_snapshot", number.stripTrailingZeros().toPlainString());
                }
                case "BOOLEAN" -> {
                    if (row.getBooleanValue() == null) {
                        throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
                    }
                    Object booleanValue = row.getBooleanValue();
                    boolean value = booleanValue instanceof Boolean bool
                            ? bool : ((Number) booleanValue).intValue() != 0;
                    itemSnapshot.put("boolean_value_snapshot", value);
                }
                default -> throw new IllegalStateException("ORDER_ATTRIBUTE_SNAPSHOT_INVALID");
            }
            byProduct.get(productId).add(itemSnapshot);
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
            } catch (JacksonException exception) {
                throw new IllegalStateException("Could not serialize Product attribute snapshot", exception);
            }
        }
        return Map.copyOf(result);
    }
}
