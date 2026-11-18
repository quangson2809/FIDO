#!/usr/bin/env bash
set -euo pipefail

# Run from backend with TEST_DB_* pointing to a disposable local MySQL database.
./gradlew --no-daemon compileJava compileTestJava checkJavaFormat test \
  --tests com.fido.common.ArchitectureBoundaryTests \
  --tests com.fido.common.exception.ApiExceptionHandlerTests \
  --tests 'com.fido.modules.order.*Tests' \
  --tests com.fido.modules.report.ReportApiTest \
  --tests com.fido.modules.report.repository.ReportRepositoryTests \
  --tests com.fido.modules.account.CustomerQueryApiTest \
  --tests com.fido.modules.audit.service.AuditPayloadPolicyTests \
  --tests com.fido.config.devseed.DevDataSeedServiceTests \
  --tests com.fido.persistence.SchemaMappingTests \
  --tests com.fido.persistence.RemoveShippingInfoMigrationTests
