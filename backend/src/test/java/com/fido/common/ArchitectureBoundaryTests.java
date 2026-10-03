package com.fido.common;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fido.FidoApplication;
import java.lang.annotation.Annotation;
import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.type.classreading.CachingMetadataReaderFactory;

class ArchitectureBoundaryTests {

    private static final String ROOT_PACKAGE = "com.fido";
    private static final String MODULE_PREFIX = "com.fido.modules.";

    @Test
    void backendPreservesDocumentedDependencyBoundaries() throws Exception {
        List<Class<?>> classes = applicationClasses();
        List<String> violations = new ArrayList<>();

        for (Class<?> type : classes) {
            rejectFieldInjection(type, violations);
            rejectControllerPersistenceDependencies(type, violations);
            rejectCrossModuleRepositoryDependencies(type, violations);
            rejectEntityTechnicalLayerDependencies(type, violations);
        }

        assertTrue(
                violations.isEmpty(),
                () -> "Architecture boundary violations:\n - "
                        + String.join("\n - ", violations)
        );
    }

    private List<Class<?>> applicationClasses() throws Exception {
        var resolver = new PathMatchingResourcePatternResolver();
        var metadata = new CachingMetadataReaderFactory(resolver);
        var loader = Thread.currentThread().getContextClassLoader();
        URL productionLocation = FidoApplication.class
                .getProtectionDomain()
                .getCodeSource()
                .getLocation();
        var classes = new ArrayList<Class<?>>();

        for (var resource : resolver.getResources("classpath*:com/fido/**/*.class")) {
            String className = metadata
                    .getMetadataReader(resource)
                    .getClassMetadata()
                    .getClassName();

            if (className.contains("$")) {
                continue;
            }

            Class<?> candidate = Class.forName(className, false, loader);

            if (candidate.getProtectionDomain().getCodeSource() == null
                    || !productionLocation.equals(
                            candidate.getProtectionDomain()
                                    .getCodeSource()
                                    .getLocation()
                    )) {
                continue;
            }

            classes.add(candidate);
        }

        return classes;
    }

    private void rejectFieldInjection(
            Class<?> owner,
            List<String> violations
    ) {
        for (Field field : owner.getDeclaredFields()) {
            if (Arrays.stream(field.getDeclaredAnnotations())
                    .map(Annotation::annotationType)
                    .map(Class::getSimpleName)
                    .anyMatch(name -> Set.of("Autowired", "Inject", "Resource").contains(name))) {
                violations.add(owner.getName() + " uses field injection: " + field.getName());
            }
        }
    }

    private void rejectControllerPersistenceDependencies(
            Class<?> owner,
            List<String> violations
    ) {
        if (!owner.getPackageName().contains(".controller")) {
            return;
        }

        for (Class<?> dependency : directDependencies(owner)) {
            String dependencyPackage = dependency.getPackageName();

            if (dependencyPackage.contains(".repository")
                    || dependencyPackage.contains(".entity")) {
                violations.add(
                        owner.getName()
                                + " depends directly on persistence type "
                                + dependency.getName()
                );
            }
        }
    }

    private void rejectCrossModuleRepositoryDependencies(
            Class<?> owner,
            List<String> violations
    ) {
        String ownerModule = moduleName(owner);

        if (ownerModule == null) {
            return;
        }

        for (Class<?> dependency : directDependencies(owner)) {
            String dependencyPackage = dependency.getPackageName();

            if (!dependencyPackage.contains(".repository")) {
                continue;
            }

            String dependencyModule = moduleName(dependency);

            if (dependencyModule != null && !ownerModule.equals(dependencyModule)) {
                violations.add(
                        owner.getName()
                                + " crosses module persistence boundary via "
                                + dependency.getName()
                );
            }
        }
    }

    private void rejectEntityTechnicalLayerDependencies(
            Class<?> owner,
            List<String> violations
    ) {
        if (!owner.getPackageName().contains(".entity")) {
            return;
        }

        for (Class<?> dependency : directDependencies(owner)) {
            String dependencyPackage = dependency.getPackageName();

            if (dependencyPackage.contains(".controller")
                    || dependencyPackage.contains(".service")
                    || dependencyPackage.contains(".repository")
                    || dependencyPackage.contains(".dto")) {
                violations.add(
                        owner.getName()
                                + " leaks technical/API layer dependency "
                                + dependency.getName()
                );
            }
        }
    }

    private Set<Class<?>> directDependencies(Class<?> owner) {
        var dependencies = new LinkedHashSet<Class<?>>();

        for (Field field : owner.getDeclaredFields()) {
            addType(dependencies, field.getType());
        }

        for (Constructor<?> constructor : owner.getDeclaredConstructors()) {
            Arrays.stream(constructor.getParameterTypes())
                    .forEach(type -> addType(dependencies, type));
        }

        for (Method method : owner.getDeclaredMethods()) {
            addType(dependencies, method.getReturnType());
            Arrays.stream(method.getParameterTypes())
                    .forEach(type -> addType(dependencies, type));
        }

        dependencies.remove(owner);
        return dependencies;
    }

    private void addType(Set<Class<?>> dependencies, Class<?> type) {
        Class<?> candidate = type;

        while (candidate.isArray()) {
            candidate = candidate.getComponentType();
        }

        if (!candidate.isPrimitive()
                && candidate.getPackageName().startsWith(ROOT_PACKAGE)) {
            dependencies.add(candidate);
        }
    }

    private String moduleName(Class<?> type) {
        String packageName = type.getPackageName();

        if (!packageName.startsWith(MODULE_PREFIX)) {
            return null;
        }

        String remainder = packageName.substring(MODULE_PREFIX.length());
        int separator = remainder.indexOf('.');

        return separator < 0
                ? remainder
                : remainder.substring(0, separator);
    }
}
