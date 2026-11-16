# Backend architecture

FIDO uses a modular monolith organized by feature. Business code lives under `com.fido.modules.<module>`; `com.fido.config` and `com.fido.common` contain technical concerns. `com.fido.FidoApplication` is the entry point. See `docs/01-architecture-package-structure.md` for the normative layer/dependency rules and `backend/AGENTS.md` for working and review guidance.

| Module | Ownership |
| --- | --- |
| `account` | Authentication, profile/address, staff, roles, permissions and customer back-office |
| `product` | Catalog, category/brand/size/color, products, images and variants |
| `cart` | Authenticated cart operations; guest session behavior remains deferred |
| `promotion` | Voucher identifier/integration; discount rules remain deferred |
| `order` | Checkout, order lifecycle, COD/payment, shipping and after-sales commands |
| `inventory` | Supplier, goods receipt, sellable inventory and immutable movement ledger |
| `audit` | Important action history |
| `report` | Read-only sales/status aggregates |
| `content` | Public and admin information pages |

Each module uses only the packages and classes it needs. Controllers handle HTTP; services own domain orchestration and transaction boundaries; repositories perform persistence and queries. Controllers do not return JPA entities. Cross-module writes use the owning module's service contract, and cross-module reads use explicit contracts or read models; modules do not inject each other's repositories. Report's aggregate-only JDBC queries are an explicit documented exception to ordinary module reads and do not change Order/Payment ownership.

## Current implementation status

The old Phase 0 discovery snapshot was taken from `main` at `416e6f64e3b1ddf71a82fd34cb43f962bd03a130` on 2026-09-26. Its claims that migrations, JWT and business implementations were absent described that historic checkout. They are **not current branch status**.

This branch now includes Flyway migrations for the approved relational baseline, Spring Security JWT/RBAC, services/controllers/repositories for the implemented backend phases, and H2/MySQL CI verification. The Phase 7 and later implementation reports are historical evidence under `docs/archive/`; they do not describe the current ERD v2 target. The active runtime roadmap and open scope are in `docs/11-implementation-phases.md` and `docs/12-tbd-out-of-scope.md`. Technical decisions belong in `docs/15-technical-decisions.md`.

Some services have distinct query and command entry points to isolate real responsibilities. This is an in-process service organization, not a requirement to split every service or adopt separate read/write data stores. Commands may read for validation; queries have no persistence side effects. Use KISS/YAGNI and evidence about cohesion, coupling, transaction boundaries and change cost before adding abstractions.

## Bố trí source và định dạng

Các folder con chỉ gom những lớp cùng xử lý một mục đích, không tạo thêm tầng trung gian:

| Package | Mục đích |
| --- | --- |
| `account.service.identity` | Đăng nhập, token, danh tính điện thoại, truy cập và khóa tài khoản |
| `order.service.lifecycle` | Policy, handler, thu/hoàn COD và truy vấn chi tiết vòng đời đơn |
| `order.service.checkout` | Chuẩn hóa request, báo giá, tính toán và tạo đơn |
| `inventory.service.stock` | Lệnh kho, các workflow nguồn và ghi số dư/ledger |
| `inventory.repository.projection` | Giao diện kết quả đọc kho và đối soát |
| `product.service.query` | Đọc catalog, family, metadata và snapshot Product |

Service còn lại, controller, entity và DTO giữ nhóm hiện có khi chưa cần chia nhỏ. Các lớp package-private đi cùng cụm cộng tác; việc chuyển folder không mở rộng quyền truy cập.

Java dùng google-java-format chế độ AOSP, thụt lề 4 dấu cách theo `.editorconfig`. Chạy trong thư mục `backend`:

```sh
./gradlew formatJava
./gradlew checkJavaFormat
```

`check` tự chạy `checkJavaFormat`. Formatter giữ Javadoc tiếng Việt và không tự tách chuỗi dài; không chạy trên SQL migration.

## Verification boundary

`.github/workflows/backend-verification.yml` runs H2 build and MySQL migration/mapping/tests. `ArchitectureBoundaryTests` also enforces a small set of non-negotiable structural rules against production classes: no field injection, no controller-to-persistence dependency, no cross-module repository dependency, and no entity dependency on API/service/repository/DTO layers.

This executable guard protects clear dependency boundaries; it does **not** score design quality or replace contextual review of cohesion, responsibilities, transaction ownership, security, business behavior or appropriate abstractions. CI remains technical evidence only, and a green build by itself is not sufficient evidence that the whole backend has been audited.
