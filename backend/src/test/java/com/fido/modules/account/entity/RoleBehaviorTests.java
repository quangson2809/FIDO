package com.fido.modules.account.entity;

import static org.junit.jupiter.api.Assertions.*;

import com.fido.common.exception.BusinessRuleException;

import org.junit.jupiter.api.Test;

class RoleBehaviorTests {
    @Test
    void roleRejectsUnknownAndNullStatusWithoutChangingState() {
        Role role = Role.create("ADMIN", "Admin", null);
        assertThrows(BusinessRuleException.class, () -> role.changeStatus("UNKNOWN"));
        assertThrows(BusinessRuleException.class, () -> role.changeStatus(null));
        assertEquals("ACTIVE", role.getStatus());
    }

    @Test
    void roleCodeCannotBeReassignedAfterCreation() throws Exception {
        Role role = Role.create("ADMIN", "Admin", null);
        role.changeStatus("INACTIVE");
        assertThrows(
                NoSuchMethodException.class, () -> Role.class.getMethod("setCode", String.class));
        assertFalse(
                java.lang.reflect.Modifier.isPublic(
                        Role.class.getDeclaredConstructor().getModifiers()));
        assertEquals("ADMIN", role.getCode());
    }

    @Test
    void superadminCannotBeDisabledWhileOrdinaryRoleCan() {
        Role root = Role.create("SUPERADMIN", "Superadmin", null);
        assertThrows(BusinessRuleException.class, () -> root.changeStatus("INACTIVE"));
        assertEquals("ACTIVE", root.getStatus());
        Role admin = Role.create("ADMIN", "Admin", null);
        admin.changeStatus("INACTIVE");
        assertEquals("INACTIVE", admin.getStatus());
    }
}
