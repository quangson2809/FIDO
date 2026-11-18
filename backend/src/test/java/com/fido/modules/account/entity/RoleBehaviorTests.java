package com.fido.modules.account.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

class RoleBehaviorTests {
    @Test
    void superadminCannotBeDisabledWhileOrdinaryRoleCan() {
        Role root = new Role();
        root.setCode("SUPERADMIN");
        assertThrows(BusinessRuleException.class, () -> root.changeStatus("INACTIVE"));
        assertEquals("ACTIVE", root.getStatus());
        Role admin = new Role();
        admin.setCode("ADMIN");
        admin.changeStatus("INACTIVE");
        assertEquals("INACTIVE", admin.getStatus());
    }
}
