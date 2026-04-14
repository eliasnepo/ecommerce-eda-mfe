# Tasks — Phase 6 (Order Service)

**Spec:** `SPEC.md`
**Design doc:** `docs/DESIGN_DOC.md` (Phase 6, sections 3.3 and 6)
**Last updated:** 2026-04-13

Check off each task as it is completed. Tasks are ordered by implementation sequence — dependencies flow top-to-bottom within each section. The directory `apps/orders-service/` already exists from a Phase-1 scaffold; do not rename it.

---

## Phase 6 — Order Service

### 6.1 Build file and dependencies

- [ ] Edit `apps/orders-service/build.gradle`:
  - [ ] Add the `org.jetbrains.kotlin.plugin.jpa` plugin (same version as the existing Kotlin plugins, `2.2.21`)
  - [ ] Add runtime / implementation dependencies:
    - `org.springframework.boot:spring-boot-starter-data-jpa`
    - `org.springframework.boot:spring-boot-starter-validation`
    - `org.springframework.boot:spring-boot-starter-actuator`
    - `org.springframework.kafka:spring-kafka`
    - `org.flywaydb:flyway-core`
    - `org.flywaydb:flyway-database-postgresql`
    - `org.postgresql:postgresql` (runtimeOnly)
  - [ ] Add test dependencies:
    - `org.springframework.kafka:spring-kafka-test`
    - `org.testcontainers:junit-jupiter:1.20.4`
    - `org.testcontainers:postgresql:1.20.4`
    - `org.testcontainers:kafka:1.20.4`
  - [ ] Keep existing `spring-boot-starter-webmvc`, `kotlin-reflect`, `jackson-module-kotlin`, and Kotlin compiler options
- [ ] Run `./gradlew build -x test` from `apps/orders-service/` and verify the project compiles with the new plugin + dependencies

### 6.2 Configuration

- [ ] Replace the contents of `src/main/resources/application.yaml` with the full Phase-6 config from SPEC.md §Configuration:
  - [ ] `spring.application.name = orders-service`
  - [ ] Datasource for Postgres (`jdbc:postgresql://localhost:5432/ecommerce`, user/pass `ecommerce`)
  - [ ] JPA `ddl-auto: validate`, `default_schema: orders`, `open-in-view: false`
  - [ ] Flyway `schemas: orders`, `baseline-on-migrate: true`
  - [ ] Kafka producer config with `StringSerializer` key and `JsonSerializer` value and `spring.json.add.type.headers: false`
  - [ ] `orders.kafka.topic = order.created`, `partitions = 3`, `replication-factor = 1`
  - [ ] `server.port = 8082`
  - [ ] Actuator `health,info,metrics` exposed
- [ ] Create `src/main/resources/application-local.yaml` with DEBUG logging for `com.commerce.orders` and `org.hibernate.SQL`

### 6.3 Database migration

- [ ] Create directory `src/main/resources/db/migration/`
- [ ] Create `V1__create_orders_schema.sql`:
  - [ ] `CREATE SCHEMA IF NOT EXISTS orders;`
  - [ ] `orders.orders` table: `id UUID PK`, `user_id BIGINT NOT NULL`, `status VARCHAR(32) NOT NULL`, `total NUMERIC(10,2) NOT NULL`, `created_at TIMESTAMP NOT NULL DEFAULT now()`
  - [ ] Index `idx_orders_user_id` on `user_id`
  - [ ] `orders.order_items` table: `id UUID PK`, `order_id UUID NOT NULL REFERENCES orders.orders ON DELETE CASCADE`, `product_id UUID`, `product_name VARCHAR(255)`, `unit_price NUMERIC(10,2)`, `quantity INT CHECK > 0`
  - [ ] Index `idx_order_items_order_id` on `order_id`

### 6.4 Domain model

- [ ] Create `domain/OrderStatus.kt` — enum `PENDING`, `CONFIRMED`, `CANCELLED`
- [ ] Create `domain/Order.kt`:
  - [ ] `@Entity @Table(name = "orders", schema = "orders")`
  - [ ] `@EntityListeners(AuditingEntityListener::class)`
  - [ ] Fields: `id: UUID?`, `userId: Long`, `status: OrderStatus = PENDING`, `total: BigDecimal`, `items: MutableList<OrderItem>`, `createdAt: Instant?`
  - [ ] `@OneToMany(mappedBy = "order", cascade = [ALL], orphanRemoval = true)`
  - [ ] `@CreatedDate` on `createdAt`
  - [ ] `addItem(item)` helper that sets the bidirectional link
- [ ] Create `domain/OrderItem.kt`:
  - [ ] `@Entity @Table(name = "order_items", schema = "orders")`
  - [ ] Fields: `id: UUID?`, `order: Order?` (`@ManyToOne LAZY`), `productId: UUID`, `productName: String`, `unitPrice: BigDecimal`, `quantity: Int`

### 6.5 JPA auditing config

- [ ] Create `config/JpaAuditingConfig.kt` with `@Configuration` and `@EnableJpaAuditing`

### 6.6 Repository

- [ ] Create `repository/OrderRepository.kt` extending `JpaRepository<Order, UUID>` with:
  - [ ] `findWithItemsById(id: UUID): Order?` annotated `@EntityGraph(attributePaths = ["items"])`
  - [ ] `findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<Order>` annotated `@EntityGraph(attributePaths = ["items"])`

### 6.7 DTOs

- [ ] Create `dto/CreateOrderRequest.kt` with `userId: Long?` (`@NotNull @Positive`) and `items: List<OrderItemRequest>` (`@NotEmpty @Valid`)
- [ ] Create `dto/OrderItemRequest.kt` with `productId: UUID?`, `productName: String?` (`@NotBlank`), `price: BigDecimal?` (`@Positive`), `quantity: Int?` (`@Positive`)
- [ ] Create `dto/OrderResponse.kt` with companion `from(order: Order)`
- [ ] Create `dto/OrderItemResponse.kt` with companion `from(item: OrderItem)`

### 6.8 Kafka event + publisher + topic bean

- [ ] Create `event/OrderCreatedEvent.kt`:
  - [ ] Data class with `eventId`, `orderId`, `userId`, `total`, `items`, `createdAt`
  - [ ] Nested `OrderCreatedItem` data class
  - [ ] Companion `from(order: Order)` that generates a fresh `eventId = UUID.randomUUID()`
- [ ] Create `event/OrderEventPublisher.kt`:
  - [ ] `@Component` wrapping `KafkaTemplate<String, Any>`
  - [ ] `publish(event)` using `event.orderId.toString()` as the record key
  - [ ] `whenComplete` callback that logs success offset or error
- [ ] Create `config/KafkaTopicConfig.kt`:
  - [ ] `@Bean orderCreatedTopic()` returning a `NewTopic` built from `orders.kafka.*` properties
  - [ ] Use `TopicBuilder.name(topic).partitions(partitions).replicas(replicationFactor)`

### 6.9 Service layer

- [ ] Create `service/OrderService.kt`:
  - [ ] Annotate with `@Service` and `@Transactional`
  - [ ] Constructor-injected `OrderRepository` and `OrderEventPublisher`
  - [ ] `placeOrder(request)` — build `Order`, append items, compute `total = sum(unitPrice * quantity)`, save, publish event, return `OrderResponse.from(saved)`
  - [ ] `findById(id)` annotated `@Transactional(readOnly = true)` — throw `OrderNotFoundException(id)` when missing
  - [ ] `findByUserId(userId)` annotated `@Transactional(readOnly = true)` — return list ordered by `createdAt DESC`
- [ ] Declare `class OrderNotFoundException(id: UUID) : RuntimeException(...)` in the same file (or `service/OrderNotFoundException.kt`)

### 6.10 REST controller

- [ ] Create `controller/OrderController.kt`:
  - [ ] `@RestController @RequestMapping("/api/orders")`
  - [ ] `POST` — accepts `@Valid @RequestBody CreateOrderRequest`, returns `201 Created` with `Location: /api/orders/{orderId}` and body `OrderResponse`
  - [ ] `GET /{id}` — returns `OrderResponse`
  - [ ] `GET /user/{userId}` — returns `List<OrderResponse>`
- [ ] Create `controller/GlobalExceptionHandler.kt`:
  - [ ] `@RestControllerAdvice`
  - [ ] Handle `OrderNotFoundException` → 404 + `ApiError(NOT_FOUND, ...)`
  - [ ] Handle `MethodArgumentNotValidException` → 400 + `ApiError(VALIDATION_FAILED, ...)` with joined field errors
  - [ ] `ApiError` data class with `status`, `error`, `message`, `timestamp`

### 6.11 Tests

- [ ] Create `test/kotlin/com/commerce/orders/service/OrderServiceTest.kt`:
  - [ ] `@ExtendWith(MockitoExtension::class)`
  - [ ] Mock `OrderRepository` and `OrderEventPublisher`
  - [ ] Test `placeOrder` computes total correctly (e.g., two items, mixed prices / quantities)
  - [ ] Test `placeOrder` publishes exactly one event with matching `orderId`
  - [ ] Test `findById` throws `OrderNotFoundException` on missing row
- [ ] Create `test/kotlin/com/commerce/orders/controller/OrderControllerTest.kt`:
  - [ ] `@WebMvcTest(OrderController::class)` + `@MockitoBean OrderService`
  - [ ] Test `POST /api/orders` valid → 201 + `Location` header
  - [ ] Test `POST /api/orders` missing `userId` → 400, `VALIDATION_FAILED`
  - [ ] Test `POST /api/orders` empty `items` → 400
  - [ ] Test `GET /api/orders/{id}` unknown → 404, `NOT_FOUND`
- [ ] Create `test/kotlin/com/commerce/orders/integration/OrderFlowIntegrationTest.kt`:
  - [ ] `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@Testcontainers`
  - [ ] `PostgreSQLContainer("postgres:16-alpine")`
  - [ ] `KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"))`
  - [ ] `@DynamicPropertySource` for datasource + kafka bootstrap
  - [ ] POST an order via `TestRestTemplate`, assert 201 response
  - [ ] Assert a row exists in `orders.orders`
  - [ ] Assert an `OrderCreatedEvent` lands on `order.created` within 10s (use an embedded `KafkaConsumer` or `spring-kafka-test` utilities)
- [ ] Keep the existing `OrdersApplicationTests.kt` smoke test; update if needed so it still boots the full context under Testcontainers

### 6.12 Cart MFE wiring

- [ ] Edit `apps/mfe-cart/webpack.config.js`:
  - [ ] Change the default for `orderApiMode` from `'mock'` to `'gateway'`:
    ```js
    const orderApiMode = process.env.ORDER_API_MODE || 'gateway'
    ```
- [ ] Run `npm run build` (or `npm run dev`) from `apps/mfe-cart/` and confirm no type errors
- [ ] Run the existing `apps/mfe-cart/src/__tests__/checkoutClient.test.ts` and `checkoutFlow.test.tsx` — update expectations only if a test was pinning the old `mock` default (the tests should already override env per-case)

### 6.13 Docker Compose

- [ ] Edit `docker-compose.services.yml` at the repo root:
  - [ ] Update `order-service` build context from `./apps/order-service` to `./apps/orders-service` to match the actual directory
  - [ ] Keep the environment variables (`SPRING_DATASOURCE_URL`, `SPRING_KAFKA_BOOTSTRAP_SERVERS`) as-is

### 6.14 Acceptance checks (Phase 6)

- [ ] **AC-1** `docker compose -f docker-compose.infra.yml up -d` starts Postgres + Kafka cleanly
- [ ] **AC-2** `./gradlew bootRun --args='--spring.profiles.active=local'` from `apps/orders-service/` starts on port 8082 without errors
- [ ] **AC-3** Flyway creates `orders.orders` and `orders.order_items` on first start; restart is a no-op (verify via `psql -h localhost -U ecommerce -d ecommerce -c '\dt orders.*'`)
- [ ] **AC-4** `GET http://localhost:8082/actuator/health` returns `{"status":"UP"}`
- [ ] **AC-5** Topic `order.created` exists with 3 partitions:
  ```bash
  docker exec -it <kafka-container> /opt/kafka/bin/kafka-topics.sh \
    --describe --topic order.created --bootstrap-server localhost:9092
  ```
- [ ] **AC-6** `POST http://localhost:8082/api/orders` with a valid body returns `201 Created`, `Location: /api/orders/{uuid}`, and a server-computed `total`
- [ ] **AC-7** A row lands in `orders.orders` plus one per item in `orders.order_items` after a successful POST
- [ ] **AC-8** `OrderCreatedEvent` JSON appears on `order.created`:
  ```bash
  docker exec -it <kafka-container> /opt/kafka/bin/kafka-console-consumer.sh \
    --topic order.created --from-beginning --bootstrap-server localhost:9092
  ```
- [ ] **AC-9** `GET http://localhost:8082/api/orders/{id}` returns the order with items; unknown id → `404 NOT_FOUND`
- [ ] **AC-10** `GET http://localhost:8082/api/orders/user/{userId}` lists orders for that user sorted by `createdAt DESC`
- [ ] **AC-11** `POST /api/orders` with missing `userId` or empty `items` returns `400 VALIDATION_FAILED`
- [ ] **AC-12** Through the gateway: `POST http://localhost:8080/api/orders` succeeds end-to-end and the downstream request carries `X-Correlation-Id`
- [ ] **AC-13** Cart MFE "Place Order" against the real gateway shows a real server UUID (not `MOCK-...`) on the confirmation page
- [ ] **AC-14** `./gradlew test` from `apps/orders-service/` is green (unit + slice + Testcontainers integration)
