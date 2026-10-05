package com.fido.modules.product.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class ImageRetentionPolicyTests {

    @Test
    void remoteStorageBoundaryRemainsUploadOnlyForMvp() {
        Set<String> operations = Arrays.stream(
                        ImageStorageGateway.class.getDeclaredMethods()
                )
                .map(Method::getName)
                .collect(Collectors.toSet());

        assertEquals(Set.of("upload"), operations);
    }
}
