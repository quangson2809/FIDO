package com.fido.modules.account;

import com.fido.modules.account.dto.request.PermissionCreateRequest;
import com.fido.modules.account.service.RbacService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class RbacTransactionTests {
    @Autowired RbacService service;
    @Autowired JdbcTemplate jdbc;

    @Test
    @WithMockUser(authorities="ROLE_SUPERADMIN")
    void failedAuditRollsBackPermissionMutation() {
        String code="test.rollback."+java.util.UUID.randomUUID();
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
            () -> service.createPermission(-999L,new PermissionCreateRequest(code,"Rollback test")));
        assertEquals(0,jdbc.queryForObject("SELECT COUNT(*) FROM permissions WHERE code=?",Integer.class,code));
    }
    @Test
    @WithMockUser(authorities="ROLE_ADMIN")
    void serviceRejectsEmployeeEvenWhenBypassingHttp() {
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
            () -> service.createPermission(1L,new PermissionCreateRequest("test.denied","Denied")));
    }
}
