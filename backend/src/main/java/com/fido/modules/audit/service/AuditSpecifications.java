package com.fido.modules.audit.service;

import com.fido.modules.audit.entity.AuditLog;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import org.springframework.data.jpa.domain.Specification;

public final class AuditSpecifications {

    private AuditSpecifications() {
    }

    public static Specification<AuditLog> search(
            AuditSearchFilter filter
    ) {
        return (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();

            if (filter.actorAccountId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("actorAccountId"),
                                filter.actorAccountId()
                        )
                );
            }

            if (filter.action() != null) {
                predicates.add(
                        cb.equal(
                                root.get("action"),
                                filter.action()
                        )
                );
            }

            if (filter.targetType() != null) {
                predicates.add(
                        cb.equal(
                                root.get("targetType"),
                                filter.targetType()
                        )
                );
            }

            if (filter.targetId() != null) {
                predicates.add(
                        cb.equal(
                                root.get("targetId"),
                                filter.targetId()
                        )
                );
            }

            if (filter.from() != null) {
                predicates.add(
                        cb.greaterThanOrEqualTo(
                                root.get("createdAt"),
                                filter.from()
                        )
                );
            }

            if (filter.to() != null) {
                predicates.add(
                        cb.lessThanOrEqualTo(
                                root.get("createdAt"),
                                filter.to()
                        )
                );
            }

            return cb.and(
                    predicates.toArray(Predicate[]::new)
            );
        };
    }
}
