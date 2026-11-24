plugins {
    java
    id("org.springframework.boot") version "4.0.3"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.fido"
version = "0.0.1-SNAPSHOT"
description = "FIDO backend"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(17)
    }
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

// Công cụ định dạng tách khỏi dependency chạy ứng dụng.
val javaFormatter by configurations.creating

sourceSets {
    test {
        resources.srcDir("../reference")
    }
}

repositories {
    mavenCentral()
}

dependencies {
    add(javaFormatter.name, "com.google.googlejavaformat:google-java-format:1.22.0:all-deps")
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-mail")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.0.2")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    developmentOnly("org.springframework.boot:spring-boot-devtools")
    runtimeOnly("com.mysql:mysql-connector-j")
    runtimeOnly("org.flywaydb:flyway-mysql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("com.h2database:h2")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

val javaSources = fileTree("src") { include("**/*.java") }

fun registerJavaFormatter(taskName: String, checkOnly: Boolean) {
    tasks.register<JavaExec>(taskName) {
        group = "formatting"
        description = if (checkOnly) "Kiểm tra định dạng Java thống nhất" else "Định dạng lại mã Java"
        classpath = javaFormatter
        mainClass.set("com.google.googlejavaformat.java.Main")
        workingDir = projectDir
        jvmArgs(
            "--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED",
            "--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED"
        )
        doFirst {
            val mode = if (checkOnly) listOf("--dry-run", "--set-exit-if-changed") else listOf("--replace")
            val arguments =
                listOf("--aosp", "--skip-javadoc-formatting", "--skip-reflowing-long-strings") +
                    mode + javaSources.files.sortedBy { it.path }.map {
                        it.relativeTo(projectDir).invariantSeparatorsPath
                    }
            // Truyền qua file để danh sách source không vượt giới hạn lệnh trên Windows.
            val argumentFile = layout.buildDirectory.file("formatting/$taskName.args").get().asFile
            argumentFile.parentFile.mkdirs()
            argumentFile.writeText(arguments.joinToString("\n"))
            setArgs(listOf("@${argumentFile.absolutePath}"))
        }
    }
}

registerJavaFormatter("formatJava", false)
registerJavaFormatter("checkJavaFormat", true)

tasks.named("check") {
    dependsOn("checkJavaFormat")
}

tasks.withType<Test> {
    useJUnitPlatform()
    testLogging {
        events("failed")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }
}

// Cố định thư mục chạy ở backend để .env được tìm đúng dù IDE khởi chạy từ thư mục khác.
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    workingDir = projectDir
}
