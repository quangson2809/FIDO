#!/usr/bin/env bash
set -euo pipefail

# Run from backend; TEST_DB_* must identify an isolated MySQL database for integration tests.
./gradlew --no-daemon compileJava compileTestJava checkJavaFormat test \
  --tests 'com.fido.modules.*.entity.*Tests' \
  --tests com.fido.common.ArchitectureBoundaryTests \
  --tests com.fido.common.exception.ApiExceptionHandlerTests \
  --tests com.fido.modules.order.service.OrderPolicyTests \
  --tests 'com.fido.modules.order.service.lifecycle.*Tests' \
  --tests 'com.fido.modules.promotion.service.*Tests' \
  --tests com.fido.modules.order.CustomerOrderCancellationHttpTests \
  --tests com.fido.modules.order.OrderActionContractHttpTests \
  --tests com.fido.modules.order.OrderActionTransactionHttpTests \
  --tests com.fido.modules.order.OrderLifecycleHttpTests \
  --tests com.fido.modules.order.OrderHardeningHttpTests \
  --tests com.fido.modules.order.OrderStockHttpTests \
  --tests com.fido.modules.order.OrderConcurrencyTests \
  --tests com.fido.modules.order.OrderAuthorizationHttpTests \
  --tests com.fido.modules.order.CheckoutCartTransactionTests \
  --tests com.fido.modules.order.CheckoutConsistencyHttpTests \
  --tests com.fido.modules.inventory.GoodsReceiptHttpTests \
  --tests com.fido.modules.inventory.InventoryPhase4TransactionTests.failedLedgerInsertRollsBackReceiptAndInventoryTogether \
  --tests com.fido.modules.inventory.InventoryPhase4TransactionTests.receiptMovementReplayUsesPersistedReceiptItemIdentityAndDoesNotMutateTwice \
  --tests com.fido.modules.cart.CartItemHttpTests \
  --tests com.fido.modules.cart.CartAccessHttpTests \
  --tests com.fido.modules.cart.CartCheckoutImageHttpTests \
  --tests com.fido.modules.cart.CartConcurrencyTests \
  --tests com.fido.modules.cart.CheckoutQuoteHttpTests \
  --tests com.fido.persistence.ReusableCartMigrationTests \
  --tests com.fido.config.devseed.DevDataSeedServiceTests \
  --tests com.fido.modules.account.RbacHttpTests \
  --tests com.fido.modules.account.RbacTransactionTests \
  --tests com.fido.modules.account.SuperadminAssignmentConcurrencyTests \
  --tests com.fido.modules.content.ContentPageApiTest
