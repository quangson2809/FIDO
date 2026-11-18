package com.fido.modules.content.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

class ContentPageBehaviorTests {
    @Test
    void archivedContentMustReturnToDraftBeforePublishing() {
        ContentPage page = new ContentPage();
        page.changeStatus("PUBLISHED");
        page.changeStatus("ARCHIVED");
        assertThrows(BusinessRuleException.class, () -> page.changeStatus("PUBLISHED"));
        assertEquals("ARCHIVED", page.getStatus());
        page.changeStatus("DRAFT");
        page.changeStatus("PUBLISHED");
        assertEquals("PUBLISHED", page.getStatus());
    }
}
