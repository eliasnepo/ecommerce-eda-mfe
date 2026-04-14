# Implementation Spec — Phase 6 (Order Service)

**Status:** Ready for implementation
**Design doc:** `docs/DESIGN_DOC.md` (Phase 6, sections 3.3 and 6)
**Last updated:** 2026-04-13

---

## Phase 6 — Order Service

### Goal

Implement a Kotlin / Spring Boot 4 service that accepts order placement requests from the Cart MFE, persists orders and line items in PostgreSQL (schema `orders`), and publishes an `OrderCreated` event to the Kafka topic `order.created`. Expose REST endpoints for creating an order, fetching a single order, and listing orders by user. Wire the Cart MFE "Place Order" button to this service through the API Gateway.

### Location

`apps/orders-service/`

> The directory already exists as a Phase 1 scaffold (Kotlin 2.2.21, Spring Boot 4.0.5, Java 24 toolchain, base package `com.commerce.orders`). This spec builds on that scaffold — do **not** rename the directory or base package.

---

### Scope

In scope:
- Kotlin Spring Boot 4 service on port `8082`
- JPA entities for `Order` and `OrderItem` with Flyway-managed schema
- `POST /api/orders`, `GET /api/orders/{id}`, `GET /api/orders/user/{userId}`
- Kafka producer publishing `OrderCreatedEvent` on the `order.created` topic
- Cart MFE wiring: switch default from `mock` to `gateway` mode so the "Place Order" button calls the real service through the gateway
- `@local` Spring profile with verbose logging
- Integration test using Testcontainers (Postgres + Kafka) for the happy path

Out of scope (handled in later phases or explicitly deferred):
- Authentication / authorization — the `userId` in the payload is trusted for the PoC
- Payment processing (the request is assumed pre-priced)
- AI Service Kafka consumer (Phase 7)
- Order cancellation / update endpoints
- Dead-letter queue, retry policies, transactional outbox
- Order status transitions beyond the initial `PENDING` insert

---

### Project structure

```
apps/orders-service/
├── build.gradle
├── settings.gradle
└── src/
    ├── main/
    │   ├── kotlin/com/commerce/orders/
    │   │   ├── OrdersApplication.kt                  ← existing
    │   │   ├── config/
    │   │   │   ├── JpaAuditingConfig.kt              ← @EnableJpaAuditing
    │   │   │   └── KafkaTopicConfig.kt               ← NewTopic bean
    │   │   ├── controller/
    │   │   │   ├── OrderController.kt                ← REST endpoints
    │   │   │   └── GlobalExceptionHandler.kt         ← @RestControllerAdvice
    │   │   ├── domain/
    │   │   │   ├── Order.kt                          ← JPA entity
    │   │   │   ├── OrderItem.kt                      ← JPA entity
    │   │   │   └── OrderStatus.kt                    ← enum
    │   │   ├── dto/
    │   │   │   ├── CreateOrderRequest.kt
    │   │   │   ├── OrderItemRequest.kt
    │   │   │   ├── OrderResponse.kt
    │   │   │   └── OrderItemResponse.kt
    │   │   ├── event/
    │   │   │   ├── OrderCreatedEvent.kt              ← Kafka payload
    │   │   │   └── OrderEventPublisher.kt            ← KafkaTemplate wrapper
    │   │   ├── repository/
    │   │   │   └── OrderRepository.kt                ← JpaRepository
    │   │   └── service/
    │   │       └── OrderService.kt                   ← business + tx boundary
    │   └── resources/
    │       ├── application.yaml                      ← existing, expand
    │       ├── application-local.yaml                ← new
    │       └── db/migration/
    │           └── V1__create_orders_schema.sql      ← Flyway migration
    └── test/
        └── kotlin/com/commerce/orders/
            ├── OrdersApplicationTests.kt             ← existing smoke test
            ├── controller/
            │   └── OrderControllerTest.kt            ← @WebMvcTest slice
            ├── service/
            │   └── OrderServiceTest.kt               ← unit test with mocks
            └── integration/
                └── OrderFlowIntegrationTest.kt       ← Testcontainers happy path
```

---

### `build.gradle`

The existing file is a Phase-1 scaffold with only `spring-boot-starter-webmvc`. Replace its `dependencies` block with the full Phase-6 set below. Keep the existing plugin versions, group, and `languageVersion = 24` toolchain.

```groovy
plugins {
    id 'org.jetbrains.kotlin.jvm' version '2.2.21'
    id 'org.jetbrains.kotlin.plugin.spring' version '2.2.21'
    id 'org.jetbrains.kotlin.plugin.jpa' version '2.2.21'
    id 'org.springframework.boot' version '4.0.5'
    id 'io.spring.dependency-management' version '1.1.7'
}

group = 'com.commerce'
version = '0.0.1-SNAPSHOT'

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-webmvc'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springframework.kafka:spring-kafka'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    implementation 'org.jetbrains.kotlin:kotlin-reflect'
    implementation 'tools.jackson.module:jackson-module-kotlin'

    runtimeOnly 'org.postgresql:postgresql'

    testImplementation 'org.springframework.boot:spring-boot-starter-webmvc-test'
    testImplementation 'org.springframework.kafka:spring-kafka-test'
    testImplementation 'org.jetbrains.kotlin:kotlin-test-junit5'
    testImplementation 'org.testcontainers:junit-jupiter:1.20.4'
    testImplementation 'org.testcontainers:postgresql:1.20.4'
    testImplementation 'org.testcontainers:kafka:1.20.4'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

kotlin {
    compilerOptions {
        freeCompilerArgs.addAll '-Xjsr305=strict', '-Xannotation-default-target=param-property'
    }
}

tasks.named('test') {
    useJUnitPlatform()
}
```

> **Kotlin + JPA note:** the `kotlin("plugin.jpa")` plugin makes entity classes `open` and generates a no-arg constructor for JPA. It must be added alongside `kotlin.plugin.spring`.

---

### Database migrations (Flyway)

**`src/main/resources/db/migration/V1__create_orders_schema.sql`**

```sql
CREATE SCHEMA IF NOT EXISTS orders;

CREATE TABLE orders.orders (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     BIGINT         NOT NULL,
    status      VARCHAR(32)    NOT NULL,
    total       NUMERIC(10, 2) NOT NULL,
    created_at  TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user_id ON orders.orders (user_id);

CREATE TABLE orders.order_items (
    id           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID           NOT NULL REFERENCES orders.orders (id) ON DELETE CASCADE,
    product_id   UUID           NOT NULL,
    product_name VARCHAR(255)   NOT NULL,
    unit_price   NUMERIC(10, 2) NOT NULL,
    quantity     INT            NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order_id ON orders.order_items (order_id);
```

> The design doc uses the conceptual schema name `order`, but `order` is a SQL reserved word and awkward to quote. We standardize on `orders` throughout (table, schema, package).

Hibernate `ddl-auto` is set to `validate` so Flyway is the sole source of schema truth.

---

### Configuration

**`src/main/resources/application.yaml`** (replaces the Phase-1 stub)

```yaml
spring:
  application:
    name: orders-service

  datasource:
    url: jdbc:postgresql://localhost:5432/ecommerce
    username: ecommerce
    password: ecommerce

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_schema: orders
    open-in-view: false

  flyway:
    schemas: orders
    baseline-on-migrate: true

  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        spring.json.add.type.headers: false

orders:
  kafka:
    topic: order.created
    partitions: 3
    replication-factor: 1

server:
  port: 8082

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

**`src/main/resources/application-local.yaml`**

```yaml
logging:
  level:
    com.commerce.orders: DEBUG
    org.springframework.kafka: INFO
    org.hibernate.SQL: DEBUG
```

---

### Domain model

**`domain/OrderStatus.kt`**

```kotlin
package com.commerce.orders.domain

enum class OrderStatus {
    PENDING,
    CONFIRMED,
    CANCELLED
}
```

**`domain/Order.kt`**

```kotlin
package com.commerce.orders.domain

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "orders", schema = "orders")
@EntityListeners(AuditingEntityListener::class)
class Order(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @Column(name = "user_id", nullable = false)
    var userId: Long,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    var status: OrderStatus = OrderStatus.PENDING,

    @Column(nullable = false, precision = 10, scale = 2)
    var total: BigDecimal,

    @OneToMany(
        mappedBy = "order",
        cascade = [CascadeType.ALL],
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    var items: MutableList<OrderItem> = mutableListOf(),

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant? = null
) {
    fun addItem(item: OrderItem) {
        items.add(item)
        item.order = this
    }
}
```

**`domain/OrderItem.kt`**

```kotlin
package com.commerce.orders.domain

import jakarta.persistence.*
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "order_items", schema = "orders")
class OrderItem(

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    var order: Order? = null,

    @Column(name = "product_id", nullable = false)
    var productId: UUID,

    @Column(name = "product_name", nullable = false, length = 255)
    var productName: String,

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    var unitPrice: BigDecimal,

    @Column(nullable = false)
    var quantity: Int
)
```

> `OrderItem.order` is nullable so `addItem` can wire the back-reference after construction.

---

### DTOs

**`dto/CreateOrderRequest.kt`**

```kotlin
package com.commerce.orders.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive

data class CreateOrderRequest(
    @field:NotNull
    @field:Positive
    val userId: Long?,

    @field:NotEmpty
    @field:Valid
    val items: List<OrderItemRequest> = emptyList()
)
```

**`dto/OrderItemRequest.kt`**

```kotlin
package com.commerce.orders.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import java.math.BigDecimal
import java.util.UUID

data class OrderItemRequest(
    @field:NotNull
    val productId: UUID?,

    @field:NotBlank
    val productName: String?,

    @field:NotNull
    @field:Positive
    val price: BigDecimal?,

    @field:NotNull
    @field:Positive
    val quantity: Int?
)
```

**`dto/OrderResponse.kt`**

```kotlin
package com.commerce.orders.dto

import com.commerce.orders.domain.Order
import com.commerce.orders.domain.OrderStatus
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class OrderResponse(
    val orderId: UUID,
    val userId: Long,
    val status: OrderStatus,
    val total: BigDecimal,
    val items: List<OrderItemResponse>,
    val createdAt: Instant
) {
    companion object {
        fun from(order: Order): OrderResponse = OrderResponse(
            orderId = order.id!!,
            userId = order.userId,
            status = order.status,
            total = order.total,
            items = order.items.map(OrderItemResponse::from),
            createdAt = order.createdAt!!
        )
    }
}
```

**`dto/OrderItemResponse.kt`**

```kotlin
package com.commerce.orders.dto

import com.commerce.orders.domain.OrderItem
import java.math.BigDecimal
import java.util.UUID

data class OrderItemResponse(
    val productId: UUID,
    val productName: String,
    val unitPrice: BigDecimal,
    val quantity: Int
) {
    companion object {
        fun from(item: OrderItem): OrderItemResponse = OrderItemResponse(
            productId = item.productId,
            productName = item.productName,
            unitPrice = item.unitPrice,
            quantity = item.quantity
        )
    }
}
```

> The Cart MFE sends `price` per item (see `apps/mfe-cart/src/services/checkoutClient.ts`); the service treats that value as the unit price and computes the order `total` on the server — clients never dictate the total.

---

### Repository

**`repository/OrderRepository.kt`**

```kotlin
package com.commerce.orders.repository

import com.commerce.orders.domain.Order
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OrderRepository : JpaRepository<Order, UUID> {

    @EntityGraph(attributePaths = ["items"])
    fun findWithItemsById(id: UUID): Order?

    @EntityGraph(attributePaths = ["items"])
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<Order>
}
```

> `@EntityGraph` avoids N+1 by fetching `items` in the same query.

---

### Service

**`service/OrderService.kt`**

```kotlin
package com.commerce.orders.service

import com.commerce.orders.domain.Order
import com.commerce.orders.domain.OrderItem
import com.commerce.orders.domain.OrderStatus
import com.commerce.orders.dto.CreateOrderRequest
import com.commerce.orders.dto.OrderResponse
import com.commerce.orders.event.OrderCreatedEvent
import com.commerce.orders.event.OrderEventPublisher
import com.commerce.orders.repository.OrderRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

class OrderNotFoundException(id: UUID) : RuntimeException("Order $id not found")

@Service
@Transactional
class OrderService(
    private val orderRepository: OrderRepository,
    private val eventPublisher: OrderEventPublisher
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun placeOrder(request: CreateOrderRequest): OrderResponse {
        val order = Order(
            userId = request.userId!!,
            status = OrderStatus.PENDING,
            total = BigDecimal.ZERO
        )

        request.items.forEach { itemReq ->
            order.addItem(
                OrderItem(
                    productId = itemReq.productId!!,
                    productName = itemReq.productName!!,
                    unitPrice = itemReq.price!!,
                    quantity = itemReq.quantity!!
                )
            )
        }

        order.total = order.items
            .map { it.unitPrice.multiply(BigDecimal.valueOf(it.quantity.toLong())) }
            .fold(BigDecimal.ZERO, BigDecimal::add)

        val saved = orderRepository.save(order)
        log.debug("Persisted order {} for user {}", saved.id, saved.userId)

        eventPublisher.publish(OrderCreatedEvent.from(saved))
        return OrderResponse.from(saved)
    }

    @Transactional(readOnly = true)
    fun findById(id: UUID): OrderResponse {
        val order = orderRepository.findWithItemsById(id)
            ?: throw OrderNotFoundException(id)
        return OrderResponse.from(order)
    }

    @Transactional(readOnly = true)
    fun findByUserId(userId: Long): List<OrderResponse> =
        orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
            .map(OrderResponse::from)
}
```

> The Kafka publish call runs inside the same transaction for PoC simplicity. If publishing fails, the whole transaction rolls back — acceptable for the PoC. A transactional outbox would be the production upgrade.

---

### Kafka event + publisher

**`event/OrderCreatedEvent.kt`**

```kotlin
package com.commerce.orders.event

import com.commerce.orders.domain.Order
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class OrderCreatedEvent(
    val eventId: UUID,
    val orderId: UUID,
    val userId: Long,
    val total: BigDecimal,
    val items: List<OrderCreatedItem>,
    val createdAt: Instant
) {
    companion object {
        fun from(order: Order): OrderCreatedEvent = OrderCreatedEvent(
            eventId = UUID.randomUUID(),
            orderId = order.id!!,
            userId = order.userId,
            total = order.total,
            items = order.items.map { item ->
                OrderCreatedItem(
                    productId = item.productId,
                    productName = item.productName,
                    unitPrice = item.unitPrice,
                    quantity = item.quantity
                )
            },
            createdAt = order.createdAt!!
        )
    }
}

data class OrderCreatedItem(
    val productId: UUID,
    val productName: String,
    val unitPrice: BigDecimal,
    val quantity: Int
)
```

**`event/OrderEventPublisher.kt`**

```kotlin
package com.commerce.orders.event

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.kafka.core.KafkaTemplate
import org.springframework.stereotype.Component

@Component
class OrderEventPublisher(
    private val kafkaTemplate: KafkaTemplate<String, Any>,
    @Value("\${orders.kafka.topic}") private val topic: String
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun publish(event: OrderCreatedEvent) {
        val key = event.orderId.toString()
        kafkaTemplate.send(topic, key, event).whenComplete { result, error ->
            if (error != null) {
                log.error("Failed to publish OrderCreatedEvent {}", event.eventId, error)
            } else {
                log.debug(
                    "Published OrderCreatedEvent {} to {}-{}@{}",
                    event.eventId,
                    result.recordMetadata.topic(),
                    result.recordMetadata.partition(),
                    result.recordMetadata.offset()
                )
            }
        }
    }
}
```

> `KafkaTemplate<String, Any>` is wired automatically from the producer config. Keying by `orderId` guarantees ordering per order across consumers.

---

### Topic bean

**`config/KafkaTopicConfig.kt`**

```kotlin
package com.commerce.orders.config

import org.apache.kafka.clients.admin.NewTopic
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.kafka.config.TopicBuilder

@Configuration
class KafkaTopicConfig(
    @Value("\${orders.kafka.topic}") private val topic: String,
    @Value("\${orders.kafka.partitions}") private val partitions: Int,
    @Value("\${orders.kafka.replication-factor}") private val replicationFactor: Short
) {
    @Bean
    fun orderCreatedTopic(): NewTopic = TopicBuilder.name(topic)
        .partitions(partitions)
        .replicas(replicationFactor.toInt())
        .build()
}
```

> Spring Kafka creates the topic via `KafkaAdmin` on startup. Safe to run repeatedly; idempotent.

---

### JPA auditing config

**`config/JpaAuditingConfig.kt`**

```kotlin
package com.commerce.orders.config

import org.springframework.context.annotation.Configuration
import org.springframework.data.jpa.repository.config.EnableJpaAuditing

@Configuration
@EnableJpaAuditing
class JpaAuditingConfig
```

---

### REST controller

**`controller/OrderController.kt`**

```kotlin
package com.commerce.orders.controller

import com.commerce.orders.dto.CreateOrderRequest
import com.commerce.orders.dto.OrderResponse
import com.commerce.orders.service.OrderService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URI
import java.util.UUID

@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val orderService: OrderService
) {

    @PostMapping
    fun placeOrder(
        @Valid @RequestBody request: CreateOrderRequest
    ): ResponseEntity<OrderResponse> {
        val response = orderService.placeOrder(request)
        return ResponseEntity
            .created(URI.create("/api/orders/${response.orderId}"))
            .body(response)
    }

    @GetMapping("/{id}")
    fun getOrder(@PathVariable id: UUID): OrderResponse =
        orderService.findById(id)

    @GetMapping("/user/{userId}")
    fun listByUser(@PathVariable userId: Long): List<OrderResponse> =
        orderService.findByUserId(userId)
}
```

**`controller/GlobalExceptionHandler.kt`**

```kotlin
package com.commerce.orders.controller

import com.commerce.orders.service.OrderNotFoundException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.Instant

data class ApiError(
    val status: Int,
    val error: String,
    val message: String,
    val timestamp: Instant = Instant.now()
)

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(OrderNotFoundException::class)
    fun handleNotFound(ex: OrderNotFoundException): ResponseEntity<ApiError> =
        ResponseEntity.status(HttpStatus.NOT_FOUND).body(
            ApiError(HttpStatus.NOT_FOUND.value(), "NOT_FOUND", ex.message ?: "Not found")
        )

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(ex: MethodArgumentNotValidException): ResponseEntity<ApiError> {
        val details = ex.bindingResult.fieldErrors.joinToString(", ") {
            "${it.field}: ${it.defaultMessage}"
        }
        return ResponseEntity.badRequest().body(
            ApiError(HttpStatus.BAD_REQUEST.value(), "VALIDATION_FAILED", details)
        )
    }
}
```

> The `POST /api/orders` response shape is `{ orderId, userId, status, total, items, createdAt }`. The Cart MFE only reads `orderId` (see `checkoutClient.ts`), so adding more fields is backwards-compatible.

---

### REST request / response contract

**Request — `POST /api/orders`**

```json
{
  "userId": 1,
  "items": [
    {
      "productId": "9c8a5e32-3c5a-4ed2-9bba-0ba6de4c98d5",
      "productName": "Wireless Headphones",
      "price": 129.99,
      "quantity": 2
    }
  ]
}
```

**Response — `201 Created`**

```json
{
  "orderId": "f4e26e4f-15c0-4d58-9b2b-6a79f4a5e9a7",
  "userId": 1,
  "status": "PENDING",
  "total": 259.98,
  "items": [
    {
      "productId": "9c8a5e32-3c5a-4ed2-9bba-0ba6de4c98d5",
      "productName": "Wireless Headphones",
      "unitPrice": 129.99,
      "quantity": 2
    }
  ],
  "createdAt": "2026-04-13T10:00:00Z"
}
```

**Kafka event — topic `order.created`**

```json
{
  "eventId": "uuid",
  "orderId": "uuid",
  "userId": 1,
  "total": 259.98,
  "items": [
    {
      "productId": "uuid",
      "productName": "Wireless Headphones",
      "unitPrice": 129.99,
      "quantity": 2
    }
  ],
  "createdAt": "2026-04-13T10:00:00Z"
}
```

---

### Tests

**`service/OrderServiceTest.kt`** — unit test

- Uses Mockito (`mockito-kotlin` or the built-in Mockito from `spring-boot-starter-test` via Kotlin)
- Mocks `OrderRepository` and `OrderEventPublisher`
- Verifies:
  - `placeOrder` persists with computed total (`unit * quantity` summed)
  - `placeOrder` publishes exactly one `OrderCreatedEvent` with the matching `orderId`
  - `findById` throws `OrderNotFoundException` when repo returns `null`

**`controller/OrderControllerTest.kt`** — `@WebMvcTest(OrderController::class)` slice

- Mocks `OrderService`
- Verifies:
  - `POST /api/orders` with valid body returns 201 with `Location` header
  - `POST /api/orders` with missing `userId` returns 400 with `VALIDATION_FAILED`
  - `POST /api/orders` with empty `items` returns 400
  - `GET /api/orders/{id}` returns 404 with `NOT_FOUND` when service throws

**`integration/OrderFlowIntegrationTest.kt`** — `@SpringBootTest` with Testcontainers

- `@Container` `PostgreSQLContainer("postgres:16-alpine")`
- `@Container` `KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"))`
- `@DynamicPropertySource` wires `spring.datasource.url` and `spring.kafka.bootstrap-servers`
- Test: POSTs an order via `TestRestTemplate`, asserts 201 + row in Postgres + message consumed from `order.created` using an embedded `KafkaConsumer`

---

### Cart MFE wiring

The Phase-5 Cart MFE already has a `placeOrder` client (`apps/mfe-cart/src/services/checkoutClient.ts`) that reads three compile-time constants injected via webpack `DefinePlugin`:

| Constant | Meaning | Default (Phase 5) | Phase 6 target |
|---|---|---|---|
| `__ORDER_API_MODE__` | `mock` or `gateway` | `mock` | `gateway` |
| `__ORDER_API_URL__` | Order endpoint URL | `http://localhost:8080/api/orders` | unchanged |
| `__ORDER_USER_ID__` | Hard-coded user ID | `1` | unchanged |

Phase 6 only needs to flip the default in `apps/mfe-cart/webpack.config.js`:

```js
// BEFORE (Phase 5)
const orderApiMode = process.env.ORDER_API_MODE || 'mock'

// AFTER (Phase 6)
const orderApiMode = process.env.ORDER_API_MODE || 'gateway'
```

No other runtime code in the Cart MFE needs to change — `placeOrder` already sends `{ userId, items }` where each item has `{ productId, productName, price, quantity }`, which is exactly the shape `CreateOrderRequest` expects.

> **Verification workflow:** start infra, start gateway, start orders-service, start Cart MFE, add a product in Catalog, click "Place Order", assert a real UUID appears (not a `MOCK-...` id) and the confirmation page renders.

---

### API Gateway

No gateway changes are required. Phase 3 already registered the route:

```yaml
- id: order-service
  uri: http://localhost:8082
  predicates:
    - Path=/api/orders/**
```

The gateway forwards `X-Correlation-Id` automatically via the Phase-3 filter; the Order Service does not need to re-generate it.

---

### Docker Compose

`docker-compose.services.yml` already contains an `order-service` entry from Phase 3 (build context `./apps/order-service`). Update the build context to `./apps/orders-service` to match the actual directory name:

```yaml
order-service:
  build: ./apps/orders-service
  ports:
    - "8082:8082"
  environment:
    SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ecommerce
    SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
```

A `Dockerfile` is **not** required for the PoC acceptance criteria — local runs via `./gradlew bootRun` are sufficient. Flag the Docker build as a stretch goal.

---

## Acceptance criteria — Phase 6

| # | Criterion |
|---|-----------|
| 1 | `docker compose -f docker-compose.infra.yml up -d` starts Postgres + Kafka cleanly. |
| 2 | `./gradlew bootRun --args='--spring.profiles.active=local'` from `apps/orders-service/` starts the service on port 8082 without errors. |
| 3 | Flyway applies `V1__create_orders_schema.sql` and creates `orders.orders` and `orders.order_items` on first start. Subsequent starts are a no-op. |
| 4 | `GET http://localhost:8082/actuator/health` returns `{"status":"UP"}`. |
| 5 | The Kafka topic `order.created` exists after startup with 3 partitions (verify with `kafka-topics.sh --describe --topic order.created --bootstrap-server localhost:9092`). |
| 6 | `POST http://localhost:8082/api/orders` with a valid body returns `201 Created` with `Location: /api/orders/{uuid}` and a JSON body whose `total` equals `sum(price * quantity)` computed server-side. |
| 7 | A row is inserted in `orders.orders` and one row per item in `orders.order_items` after a successful POST. |
| 8 | A JSON event appears on topic `order.created` matching the schema in this spec (verified via `kafka-console-consumer.sh --topic order.created --from-beginning --bootstrap-server localhost:9092`). |
| 9 | `GET http://localhost:8082/api/orders/{id}` returns the order with its items; an unknown id returns `404` with body `{"status":404,"error":"NOT_FOUND",...}`. |
| 10 | `GET http://localhost:8082/api/orders/user/{userId}` returns all orders for the user ordered by `createdAt DESC`. |
| 11 | `POST http://localhost:8082/api/orders` with missing `userId` or empty `items` returns `400` with `{"status":400,"error":"VALIDATION_FAILED",...}`. |
| 12 | Through the API Gateway: `POST http://localhost:8080/api/orders` succeeds end-to-end and the downstream request carries an `X-Correlation-Id` header. |
| 13 | Cart MFE, rebuilt with the Phase-6 webpack default, calls `http://localhost:8080/api/orders` on "Place Order" and displays the real server-assigned UUID on the confirmation screen. |
| 14 | `./gradlew test` passes: unit tests for `OrderService`, slice test for `OrderController`, and the Testcontainers integration test for the full POST → persist → publish flow. |

---

## Out of scope for this spec

- AI Service Kafka consumer (Phase 7)
- Authentication / user identity verification
- Idempotency keys for `POST /api/orders` retries
- Transactional outbox / exactly-once publishing
- Order status lifecycle beyond initial `PENDING`
- Inventory decrement / stock checks
- Cancellation, refunds, or updates to existing orders
- Observability beyond Actuator (tracing / metrics dashboards)
