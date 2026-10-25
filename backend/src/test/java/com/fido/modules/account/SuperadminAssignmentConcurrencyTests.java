package com.fido.modules.account;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fido.modules.account.dto.request.StaffPatchRequest;
import com.fido.modules.account.service.StaffCommandService;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

@SpringBootTest
@ActiveProfiles("test")
class SuperadminAssignmentConcurrencyTests extends AccountHttpSupport {

    @Autowired StaffCommandService staff;

    @Test
    void simultaneousRemovalCannotRemoveBothLastSuperadminAssignments() throws Exception {
        long superadminRoleId =
                db.queryForObject("SELECT role_id FROM roles WHERE code='SUPERADMIN'", Long.class);
        List<Long> previousSuperadmins =
                db.queryForList(
                        "SELECT account_id FROM account_roles WHERE role_id=?",
                        Long.class,
                        superadminRoleId);

        db.update("DELETE FROM account_roles WHERE role_id=?", superadminRoleId);

        long firstTarget = register(phone());
        long secondTarget = register(phone());
        long auditActor = register(phone());
        grant(firstTarget, "SUPERADMIN");
        grant(secondTarget, "SUPERADMIN");

        long adminRoleId =
                db.queryForObject("SELECT role_id FROM roles WHERE code='ADMIN'", Long.class);
        StaffPatchRequest demoteToAdmin = new StaffPatchRequest();
        demoteToAdmin.setRole_ids(List.of(adminRoleId));

        var executor = Executors.newFixedThreadPool(2);
        var start = new CountDownLatch(1);

        try {
            var first =
                    executor.submit(
                            () -> attemptDemotion(auditActor, firstTarget, demoteToAdmin, start));
            var second =
                    executor.submit(
                            () -> attemptDemotion(auditActor, secondTarget, demoteToAdmin, start));
            start.countDown();

            List<Integer> statuses =
                    List.of(
                                    first.get(30, TimeUnit.SECONDS),
                                    second.get(30, TimeUnit.SECONDS))
                            .stream()
                            .sorted()
                            .toList();

            assertEquals(List.of(200, 409), statuses);
            assertEquals(
                    1,
                    db.queryForObject(
                            "SELECT COUNT(*) FROM account_roles WHERE role_id=?",
                            Integer.class,
                            superadminRoleId));
        } finally {
            executor.shutdownNow();
            db.update("DELETE FROM account_roles WHERE role_id=?", superadminRoleId);
            for (Long accountId : previousSuperadmins) {
                db.update(
                        "INSERT INTO account_roles(account_id,role_id) VALUES (?,?)",
                        accountId,
                        superadminRoleId);
            }
        }
    }

    private int attemptDemotion(
            long actorId,
            long targetId,
            StaffPatchRequest request,
            CountDownLatch start)
            throws InterruptedException {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "test-superadmin",
                        "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_SUPERADMIN"))));
        SecurityContextHolder.setContext(context);

        try {
            start.await();
            staff.update(actorId, targetId, request);
            return 200;
        } catch (ResponseStatusException exception) {
            return exception.getStatusCode().value();
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
