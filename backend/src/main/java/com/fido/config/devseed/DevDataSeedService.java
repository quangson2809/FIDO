package com.fido.config.devseed;

import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile({"dev", "test"})
public class DevDataSeedService {

    private static final Logger log = LoggerFactory.getLogger(DevDataSeedService.class);

    public static final String DEFAULT_PASSWORD = "Fido@123";

    private final PasswordEncoder passwords;
    private final DevSeedStateInspector state;
    private final DevSeedIdentityData identity;
    private final DevSeedCatalogData catalog;
    private final DevSeedOrderData orders;
    private final DevSeedInventoryData inventory;
    private final DevSeedOperationsData operations;

    public DevDataSeedService(
            PasswordEncoder passwords,
            DevSeedStateInspector state,
            DevSeedIdentityData identity,
            DevSeedCatalogData catalog,
            DevSeedOrderData orders,
            DevSeedInventoryData inventory,
            DevSeedOperationsData operations) {
        this.passwords = passwords;
        this.state = state;
        this.identity = identity;
        this.catalog = catalog;
        this.orders = orders;
        this.inventory = inventory;
        this.operations = operations;
    }

    @Transactional
    public void seed() {
        DevSeedStateInspector.SeedState initial = state.inspect();

        if (initial.complete()) {
            log.info("FIDO development seed completed and validated against target schema (already present).");
            return;
        }

        if (initial.anyPresent()) {
            throw new IllegalStateException(
                    "Partial FIDO development seed detected. "
                            + "Refusing to overwrite existing local data. "
                            + initial.mismatchSummary());
        }

        String passwordHash = passwords.encode(DEFAULT_PASSWORD);

        identity.seed(passwordHash);
        catalog.seed();
        inventory.seedInventoryRows();
        orders.seed();
        inventory.seedReceivingAndLedger();
        operations.seed();

        DevSeedStateInspector.SeedState completed = state.inspect();

        if (!completed.complete()) {
            throw new IllegalStateException(
                    "Development seed finished with incomplete data. "
                            + completed.mismatchSummary());
        }

        log.info("FIDO development seed completed and validated against target schema.");
    }
}
