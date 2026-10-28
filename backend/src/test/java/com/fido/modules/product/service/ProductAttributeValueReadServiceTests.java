package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fido.modules.product.repository.ProductAttributeValueRepository;
import com.fido.modules.product.repository.ProductAttributeValueRepository.AttributeValueReadRow;

import org.junit.jupiter.api.Test;

import java.util.List;

class ProductAttributeValueReadServiceTests {

    @Test
    void mapsTypedAttributeValuesFromOneBatchProjection() {
        ProductAttributeValueRepository repository = mock(ProductAttributeValueRepository.class);
        AttributeValueReadRow row = mock(AttributeValueReadRow.class);
        when(repository.findAttributeValuesForProduct(12L)).thenReturn(List.of(row));
        when(row.getAttributeId()).thenReturn(31L);
        when(row.getAttributeCode()).thenReturn("MATERIAL");
        when(row.getAttributeName()).thenReturn("Material");
        when(row.getTypeCode()).thenReturn("OPTION");
        when(row.getDataType()).thenReturn("OPTION");
        when(row.getOptionId()).thenReturn(44L);
        when(row.getOptionValue()).thenReturn("cotton");
        when(row.getOptionLabel()).thenReturn("Cotton");

        var result = new ProductAttributeValueReadService(repository).forProduct(12L);

        assertEquals(1, result.size());
        assertEquals(31L, result.get(0).attribute_id());
        assertEquals("MATERIAL", result.get(0).attribute_code());
        assertEquals("OPTION", result.get(0).data_type());
        assertEquals(44L, result.get(0).option_id());
        assertEquals("cotton", result.get(0).option_value());
        assertEquals("Cotton", result.get(0).option_label());
        verify(repository).findAttributeValuesForProduct(12L);
    }

    @Test
    void rejectsAnOptionMissingItsAttributeScopedOptionRow() {
        ProductAttributeValueRepository repository = mock(ProductAttributeValueRepository.class);
        AttributeValueReadRow row = mock(AttributeValueReadRow.class);
        when(repository.findAttributeValuesForProduct(12L)).thenReturn(List.of(row));
        when(row.getAttributeId()).thenReturn(31L);
        when(row.getAttributeCode()).thenReturn("MATERIAL");
        when(row.getAttributeName()).thenReturn("Material");
        when(row.getTypeCode()).thenReturn("OPTION");
        when(row.getDataType()).thenReturn("OPTION");
        when(row.getOptionId()).thenReturn(44L);
        when(row.getOptionValue()).thenReturn(null);
        when(row.getOptionLabel()).thenReturn(null);

        assertThrows(
                IllegalStateException.class,
                () -> new ProductAttributeValueReadService(repository).forProduct(12L));
    }
}
