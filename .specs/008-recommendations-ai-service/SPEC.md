# Implementation Spec — Phase 7 (Recommendations AI Service)

**Status:** Ready for implementation
**Design doc:** `docs/DESIGN_DOC.md` (Phase 7, sections 3.4, 5.3, and 6)
**Last updated:** 2026-05-01

---

## Phase 7 — Recommendations AI Service

### Goal

Implement a Java / Spring Boot service that consumes the `order.created` Kafka events published by the Order Service (Phase 6), persists per-user order history in PostgreSQL (schema `ai_history`), and exposes a REST endpoint that uses **Ollama** (a locally-hosted LLM via Spring AI) to generate insights and product recommendations grounded in that history. The service must run end-to-end through `docker compose` with no cloud LLM dependency.

The Cart MFE → API Gateway → Order Service path delivered in Phase 6 already produces the inbound events; this phase wires the consumer side and adds the recommendations endpoint that closes the PoC loop described in `README.md`.

### Location

`apps/recommendations-ai-service/`

> The directory does not yet exist. The `docker-compose.services.yml` currently references `./apps/ai-service` — update the build context to point at this directory (see §Docker Compose).

---

### Scope

In scope:
- Java 21 / Spring Boot 3.3 service on port `8083`
- Spring AI 1.0.x with the **Ollama** chat model starter (no OpenAI / cloud LLM)
- Kafka consumer on topic `order.created`, group `recommendations-ai-service`
- JPA + Flyway schema `ai_history` to store consumed orders per user
- `GET /api/ai/recommendations/{userId}` returning insights + ranked recommendations
- `@local` Spring profile pointing at `localhost` Ollama / Postgres / Kafka
- `docker-compose.infra.yml` extension that adds an Ollama service and pre-pulls the default model
- `docker-compose.services.yml` update wiring `recommendations-ai-service` → Ollama via `OLLAMA_BASE_URL`
- Unit tests for the recommendation service (mocked `ChatClient`) and Kafka consumer (mocked repository)
- Integration test using Testcontainers (Postgres + Kafka) verifying that an `order.created` event lands in `ai_history.user_orders`

Out of scope (explicit non-goals):
- Authentication / authorization on `/api/ai/recommendations/{userId}` — `userId` is trusted for the PoC
- Vector store / RAG over the product catalog (LLM is grounded by raw order history only; no embeddings)
- Streaming responses, function calling, or multi-turn chat
- Catalog MFE UI surfacing of recommendations (deferred to Phase 8 polish)
- Hot-swap of LLM provider (OpenAI, Anthropic, etc.) — only Ollama is wired in this phase
- Idempotent event handling beyond Kafka's at-least-once semantics
- Retry / DLQ topology for failed LLM calls
- Persisting generated recommendations (each request re-prompts the LLM)

---

### Project structure

```
apps/recommendations-ai-service/
├── build.gradle
├── settings.gradle
├── Dockerfile
└── src/
    ├── main/
    │   ├── java/com/commerce/recommendations/
    │   │   ├── RecommendationsApplication.java
    │   │   ├── config/
    │   │   │   ├── KafkaConsumerConfig.java        ← JsonDeserializer wiring
    │   │   │   └── JpaAuditingConfig.java
    │   │   ├── consumer/
    │   │   │   └── OrderEventConsumer.java         ← @KafkaListener
    │   │   ├── controller/
    │   │   │   ├── RecommendationController.java
    │   │   │   └── GlobalExceptionHandler.java
    │   │   ├── domain/
    │   │   │   ├── UserOrder.java                  ← JPA entity (consumed order)
    │   │   │   └── UserOrderItem.java              ← JPA entity (consumed line item)
    │   │   ├── dto/
    │   │   │   ├── OrderCreatedEvent.java          ← Kafka payload (consumer-side mirror)
    │   │   │   ├── OrderCreatedItem.java
    │   │   │   ├── RecommendationResponse.java
    │   │   │   └── RecommendedProduct.java
    │   │   ├── repository/
    │   │   │   └── UserOrderRepository.java
    │   │   └── service/
    │   │       ├── OrderHistoryService.java        ← consumer-side persistence
    │   │       └── RecommendationService.java      ← Ollama + prompt
    │   └── resources/
    │       ├── application.yml
    │       ├── application-local.yml
    │       ├── prompts/
    │       │   └── recommendation-prompt.st        ← Spring AI prompt template
    │       └── db/migration/
    │           └── V1__create_ai_history_schema.sql
    └── test/
        └── java/com/commerce/recommendations/
            ├── RecommendationsApplicationTests.java
            ├── consumer/
            │   └── OrderEventConsumerTest.java
            ├── service/
            │   ├── OrderHistoryServiceTest.java
            │   └── RecommendationServiceTest.java
            └── integration/
                └── OrderEventFlowIntegrationTest.java
```

---

### `build.gradle`

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.5'
    id 'io.spring.dependency-management' version '1.1.6'
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

ext {
    set('springAiVersion', '1.0.0')
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springframework.kafka:spring-kafka'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    implementation 'org.springframework.ai:spring-ai-starter-model-ollama'

    runtimeOnly 'org.postgresql:postgresql'

    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.kafka:spring-kafka-test'
    testImplementation 'org.testcontainers:junit-jupiter:1.20.4'
    testImplementation 'org.testcontainers:postgresql:1.20.4'
    testImplementation 'org.testcontainers:kafka:1.20.4'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}

dependencyManagement {
    imports {
        mavenBom "org.springframework.ai:spring-ai-bom:${springAiVersion}"
    }
}

tasks.named('test') {
    useJUnitPlatform()
}
```

> Spring AI 1.0.x targets Boot 3.3+. The `spring-ai-starter-model-ollama` starter auto-configures an `OllamaChatModel` and a `ChatClient.Builder` from `spring.ai.ollama.*` properties — no manual bean definitions are needed.

---

### Database migration (Flyway)

**`src/main/resources/db/migration/V1__create_ai_history_schema.sql`**

```sql
CREATE SCHEMA IF NOT EXISTS ai_history;

CREATE TABLE ai_history.user_orders (
    id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id    UUID           NOT NULL UNIQUE,
    order_id    UUID           NOT NULL,
    user_id     BIGINT         NOT NULL,
    total       NUMERIC(10, 2) NOT NULL,
    ordered_at  TIMESTAMP      NOT NULL,
    consumed_at TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_orders_user_id  ON ai_history.user_orders (user_id);
CREATE INDEX idx_user_orders_order_id ON ai_history.user_orders (order_id);

CREATE TABLE ai_history.user_order_items (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_order_id UUID           NOT NULL REFERENCES ai_history.user_orders (id) ON DELETE CASCADE,
    product_id    UUID           NOT NULL,
    product_name  VARCHAR(255)   NOT NULL,
    unit_price    NUMERIC(10, 2) NOT NULL,
    quantity      INT            NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_user_order_items_user_order_id ON ai_history.user_order_items (user_order_id);
```

> The `event_id UNIQUE` constraint provides idempotency at the database boundary: a duplicate Kafka delivery (at-least-once) attempting to insert the same `event_id` rolls back, and the consumer logs the duplicate without re-publishing or re-prompting.

Hibernate `ddl-auto` is set to `validate` so Flyway is the sole source of schema truth, matching the convention used by Product and Order services.

---

### Configuration

**`src/main/resources/application.yml`**

```yaml
spring:
  application:
    name: recommendations-ai-service

  datasource:
    url: jdbc:postgresql://localhost:5432/ecommerce
    username: ecommerce
    password: ecommerce

  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_schema: ai_history
    open-in-view: false

  flyway:
    schemas: ai_history
    baseline-on-migrate: true

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: recommendations-ai-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.commerce.recommendations.dto,com.commerce.orders.event"
        spring.json.use.type.headers: false
        spring.json.value.default.type: com.commerce.recommendations.dto.OrderCreatedEvent

  ai:
    ollama:
      base-url: http://localhost:11434
      chat:
        options:
          model: llama3.2
          temperature: 0.4

recommendations:
  kafka:
    topic: order.created
  prompt:
    max-history-orders: 10
    max-recommendations: 3

server:
  port: 8083

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: when-authorized
```

**`src/main/resources/application-local.yml`**

```yaml
logging:
  level:
    com.commerce.recommendations: DEBUG
    org.springframework.kafka: INFO
    org.springframework.ai: DEBUG
```

> `spring.json.use.type.headers: false` + `spring.json.value.default.type` lets the consumer deserialize the producer's payload without needing matching package names. The Order Service publishes with `add.type.headers: false`, so this is required.

---

### Domain model

**`domain/UserOrder.java`**

```java
package com.commerce.recommendations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "user_orders", schema = "ai_history")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
@NoArgsConstructor
public class UserOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_id", nullable = false, unique = true)
    private UUID eventId;

    @Column(name = "order_id", nullable = false)
    private UUID orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "ordered_at", nullable = false)
    private Instant orderedAt;

    @CreatedDate
    @Column(name = "consumed_at", nullable = false, updatable = false)
    private Instant consumedAt;

    @OneToMany(
        mappedBy = "userOrder",
        cascade = CascadeType.ALL,
        orphanRemoval = true,
        fetch = FetchType.LAZY
    )
    private List<UserOrderItem> items = new ArrayList<>();

    public void addItem(UserOrderItem item) {
        items.add(item);
        item.setUserOrder(this);
    }
}
```

**`domain/UserOrderItem.java`**

```java
package com.commerce.recommendations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "user_order_items", schema = "ai_history")
@Getter
@Setter
@NoArgsConstructor
public class UserOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_order_id", nullable = false)
    private UserOrder userOrder;

    @Column(name = "product_id", nullable = false)
    private UUID productId;

    @Column(name = "product_name", nullable = false, length = 255)
    private String productName;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(nullable = false)
    private Integer quantity;
}
```

---

### DTOs

**`dto/OrderCreatedEvent.java`** — consumer-side mirror of the producer payload

```java
package com.commerce.recommendations.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderCreatedEvent(
    UUID eventId,
    UUID orderId,
    Long userId,
    BigDecimal total,
    List<OrderCreatedItem> items,
    Instant createdAt
) {}
```

**`dto/OrderCreatedItem.java`**

```java
package com.commerce.recommendations.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderCreatedItem(
    UUID productId,
    String productName,
    BigDecimal unitPrice,
    Integer quantity
) {}
```

**`dto/RecommendationResponse.java`**

```java
package com.commerce.recommendations.dto;

import java.util.List;

public record RecommendationResponse(
    Long userId,
    int historyOrdersUsed,
    String insights,
    List<RecommendedProduct> recommendations
) {}
```

**`dto/RecommendedProduct.java`**

```java
package com.commerce.recommendations.dto;

public record RecommendedProduct(
    String productName,
    String category,
    String reason
) {}
```

> The recommendation response intentionally returns `productName` + `category` rather than `productId`. Without a vector store or catalog lookup the LLM cannot reliably produce real product UUIDs from `ai_history` alone. Wiring `recommendations-ai-service` to the Product Service catalog for grounded recommendations is a Phase 8+ enhancement.

---

### Repository

**`repository/UserOrderRepository.java`**

```java
package com.commerce.recommendations.repository;

import com.commerce.recommendations.domain.UserOrder;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserOrderRepository extends JpaRepository<UserOrder, UUID> {

    Optional<UserOrder> findByEventId(UUID eventId);

    @EntityGraph(attributePaths = "items")
    List<UserOrder> findAllByUserIdOrderByOrderedAtDesc(Long userId, Pageable pageable);

    long countByUserId(Long userId);
}
```

---

### Kafka consumer

**`config/KafkaConsumerConfig.java`**

```java
package com.commerce.recommendations.config;

import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    @Bean
    public ConsumerFactory<String, Object> consumerFactory(KafkaProperties props) {
        Map<String, Object> cfg = new HashMap<>(props.buildConsumerProperties(null));
        cfg.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        cfg.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        cfg.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
        cfg.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);
        return new DefaultKafkaConsumerFactory<>(cfg);
    }

    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, Object> kafkaListenerContainerFactory(
        ConsumerFactory<String, Object> consumerFactory
    ) {
        var factory = new ConcurrentKafkaListenerContainerFactory<String, Object>();
        factory.setConsumerFactory(consumerFactory);
        return factory;
    }
}
```

> `ErrorHandlingDeserializer` wraps the JSON deserializer so a malformed payload becomes a logged failure instead of a poison-pill that halts the consumer.

**`consumer/OrderEventConsumer.java`**

```java
package com.commerce.recommendations.consumer;

import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.service.OrderHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final OrderHistoryService orderHistoryService;

    @KafkaListener(
        topics = "${recommendations.kafka.topic}",
        groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onOrderCreated(OrderCreatedEvent event) {
        log.debug("Received OrderCreatedEvent {} for order {}", event.eventId(), event.orderId());
        orderHistoryService.recordOrder(event);
    }
}
```

**`service/OrderHistoryService.java`**

```java
package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.domain.UserOrderItem;
import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.repository.UserOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderHistoryService {

    private final UserOrderRepository userOrderRepository;

    @Transactional
    public void recordOrder(OrderCreatedEvent event) {
        if (userOrderRepository.findByEventId(event.eventId()).isPresent()) {
            log.info("Skipping duplicate OrderCreatedEvent {}", event.eventId());
            return;
        }

        UserOrder userOrder = new UserOrder();
        userOrder.setEventId(event.eventId());
        userOrder.setOrderId(event.orderId());
        userOrder.setUserId(event.userId());
        userOrder.setTotal(event.total());
        userOrder.setOrderedAt(event.createdAt());

        event.items().forEach(item -> {
            UserOrderItem entity = new UserOrderItem();
            entity.setProductId(item.productId());
            entity.setProductName(item.productName());
            entity.setUnitPrice(item.unitPrice());
            entity.setQuantity(item.quantity());
            userOrder.addItem(entity);
        });

        userOrderRepository.save(userOrder);
        log.debug("Persisted user order {} for user {}", userOrder.getOrderId(), userOrder.getUserId());
    }
}
```

---

### Recommendation service (Spring AI + Ollama)

**`resources/prompts/recommendation-prompt.st`**

```
You are a product recommendation engine for an e-commerce store.

The user (id={userId}) has previously ordered the following products:
{orderHistory}

Based on the patterns in this purchase history, infer the user's interests
and recommend up to {maxRecommendations} new products they are likely to enjoy.

Constraints:
- Do not recommend products that already appear in the order history.
- Each recommendation must include a category (e.g. Electronics, Books, Apparel).
- The "reason" must reference a specific signal from the order history.
- If the order history is empty, recommend popular general-interest items
  and explain that the suggestions are not yet personalized.

Also produce a one-sentence "insights" summary of the user's apparent preferences.

{format}
```

> The `{format}` placeholder is filled by Spring AI's `BeanOutputConverter` with a JSON schema description, instructing the LLM to emit JSON that matches `RecommendationResponse`.

**`service/RecommendationService.java`**

```java
package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.domain.UserOrderItem;
import com.commerce.recommendations.dto.RecommendationResponse;
import com.commerce.recommendations.dto.RecommendedProduct;
import com.commerce.recommendations.repository.UserOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.prompt.PromptTemplate;
import org.springframework.ai.converter.BeanOutputConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecommendationService {

    private final ChatClient.Builder chatClientBuilder;
    private final UserOrderRepository userOrderRepository;

    @Value("classpath:/prompts/recommendation-prompt.st")
    private Resource promptTemplate;

    @Value("${recommendations.prompt.max-history-orders}")
    private int maxHistoryOrders;

    @Value("${recommendations.prompt.max-recommendations}")
    private int maxRecommendations;

    @Transactional(readOnly = true)
    public RecommendationResponse recommend(Long userId) {
        List<UserOrder> history = userOrderRepository
            .findAllByUserIdOrderByOrderedAtDesc(userId, PageRequest.of(0, maxHistoryOrders));

        String formattedHistory = formatHistory(history);
        var converter = new BeanOutputConverter<>(RecommendationResponse.class);

        PromptTemplate template = new PromptTemplate(promptTemplate);
        var prompt = template.create(Map.of(
            "userId", userId,
            "orderHistory", formattedHistory,
            "maxRecommendations", maxRecommendations,
            "format", converter.getFormat()
        ));

        ChatClient chatClient = chatClientBuilder.build();
        String raw = chatClient.prompt(prompt).call().content();
        log.debug("LLM raw response for user {}: {}", userId, raw);

        RecommendationResponse parsed = converter.convert(raw);
        if (parsed == null) {
            throw new RecommendationGenerationException("LLM returned an unparseable response");
        }

        return new RecommendationResponse(
            userId,
            history.size(),
            parsed.insights(),
            capRecommendations(parsed.recommendations())
        );
    }

    private List<RecommendedProduct> capRecommendations(List<RecommendedProduct> recs) {
        if (recs == null) return List.of();
        return recs.stream().limit(maxRecommendations).toList();
    }

    private String formatHistory(List<UserOrder> orders) {
        if (orders.isEmpty()) {
            return "(no previous orders)";
        }
        return orders.stream()
            .flatMap(o -> o.getItems().stream())
            .map(this::renderItem)
            .collect(Collectors.joining("\n"));
    }

    private String renderItem(UserOrderItem item) {
        return "- %s (qty %d, unit $%s)".formatted(
            item.getProductName(), item.getQuantity(), item.getUnitPrice().toPlainString()
        );
    }
}
```

```java
package com.commerce.recommendations.service;

public class RecommendationGenerationException extends RuntimeException {
    public RecommendationGenerationException(String message) { super(message); }
}
```

> The Ollama starter exposes a `ChatClient.Builder` autoconfigured with the model from `spring.ai.ollama.chat.options.model`. We rebuild a fresh `ChatClient` per call so the service is stateless. Latency is dominated by the LLM (often several seconds on commodity hardware) — that is acceptable for the PoC and is documented in the acceptance criteria.

---

### REST controller

**`controller/RecommendationController.java`**

```java
package com.commerce.recommendations.controller;

import com.commerce.recommendations.dto.RecommendationResponse;
import com.commerce.recommendations.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @GetMapping("/{userId}")
    public RecommendationResponse forUser(@PathVariable Long userId) {
        return recommendationService.recommend(userId);
    }
}
```

**`controller/GlobalExceptionHandler.java`**

```java
package com.commerce.recommendations.controller;

import com.commerce.recommendations.service.RecommendationGenerationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RecommendationGenerationException.class)
    public ResponseEntity<Map<String, Object>> handleGen(RecommendationGenerationException ex) {
        log.warn("Recommendation generation failed: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of(
            "status", 502,
            "error", "RECOMMENDATION_FAILED",
            "message", ex.getMessage(),
            "timestamp", Instant.now()
        ));
    }
}
```

> A failed LLM round-trip surfaces as `502 Bad Gateway` so the upstream caller can distinguish "the dependency the gateway proxies failed" from a 4xx client-side validation error.

---

### REST request / response contract

**Request — `GET /api/ai/recommendations/1`**

(no body)

**Response — `200 OK`**

```json
{
  "userId": 1,
  "historyOrdersUsed": 4,
  "insights": "User favors compact electronics and audio peripherals at the mid-price tier.",
  "recommendations": [
    {
      "productName": "Bluetooth Travel Speaker",
      "category": "Electronics",
      "reason": "Pairs with the wireless headphones already in the order history."
    },
    {
      "productName": "Mechanical Keyboard",
      "category": "Electronics",
      "reason": "Aligns with the compact-electronics theme of recent purchases."
    },
    {
      "productName": "Noise-Cancelling Earbuds",
      "category": "Electronics",
      "reason": "Complements the audio-peripheral preference seen in past orders."
    }
  ]
}
```

**Response — `502 Bad Gateway`** (LLM unreachable / unparseable)

```json
{
  "status": 502,
  "error": "RECOMMENDATION_FAILED",
  "message": "LLM returned an unparseable response",
  "timestamp": "2026-05-01T10:00:00Z"
}
```

---

### Tests

**`service/OrderHistoryServiceTest.java`** — unit test

- `@ExtendWith(MockitoExtension.class)`
- Mock `UserOrderRepository`
- Verifies:
  - `recordOrder` calls `save` once with the mapped `UserOrder` and items
  - `recordOrder` short-circuits (does not call `save`) when `findByEventId` returns a present value (idempotency path)

**`service/RecommendationServiceTest.java`** — unit test

- Mock `UserOrderRepository` and a stubbed `ChatClient.Builder` that returns a JSON string matching `RecommendationResponse`
- Verifies:
  - History items are rendered into the prompt (use an `ArgumentCaptor` to inspect the prompt content)
  - `maxRecommendations` cap is enforced even when the LLM returns more
  - Empty history yields a prompt containing `(no previous orders)`
  - Unparseable LLM output throws `RecommendationGenerationException`

**`consumer/OrderEventConsumerTest.java`** — unit test

- Mock `OrderHistoryService`
- Verifies the `@KafkaListener` method delegates to `orderHistoryService.recordOrder` with the deserialized event

**`integration/OrderEventFlowIntegrationTest.java`** — `@SpringBootTest` with Testcontainers

- `@Container` `PostgreSQLContainer("postgres:16-alpine")`
- `@Container` `KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"))`
- `@DynamicPropertySource` wires `spring.datasource.url` and `spring.kafka.bootstrap-servers`
- Stub-out the Ollama `ChatClient.Builder` with a `@TestConfiguration` `@Primary` bean that returns canned JSON, so the test does not require a running Ollama
- Test:
  1. Publish an `OrderCreatedEvent` JSON to the `order.created` topic via a `KafkaTemplate`
  2. Await up to 10s for `UserOrderRepository.countByUserId(1)` to become 1
  3. Hit `GET /api/ai/recommendations/1` via `TestRestTemplate`
  4. Assert 200 + `historyOrdersUsed = 1` + non-empty `recommendations`

> The integration test is intentionally Ollama-free. A separate manual smoke test (documented in §Acceptance criteria) exercises the real Ollama path via `docker compose`.

---

### Cart MFE / API Gateway wiring

The Cart MFE and API Gateway require **no code changes** for Phase 7. The gateway already routes `/api/ai/**` to the AI service URI:

```yaml
- id: ai-service
  uri: http://localhost:8083
  predicates:
    - Path=/api/ai/**
```

Phase 8 will add a Catalog MFE / Shell UI for surfacing recommendations.

> If the gateway is run via `docker-compose.services.yml` rather than `bootRun`, override the route URI via env so the gateway points at the new container name (see §Docker Compose).

---

### Docker Compose

#### `docker-compose.infra.yml` — add Ollama

Append a new service so `docker compose -f docker-compose.infra.yml up -d` starts Ollama alongside Postgres / Elasticsearch / Kafka:

```yaml
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    healthcheck:
      test: ["CMD-SHELL", "ollama list >/dev/null 2>&1 || exit 1"]
      interval: 15s
      timeout: 10s
      retries: 10

  ollama-model-pull:
    image: ollama/ollama:latest
    depends_on:
      ollama:
        condition: service_healthy
    entrypoint: ["/bin/sh", "-c"]
    command: ["OLLAMA_HOST=http://ollama:11434 ollama pull llama3.2 && echo 'model ready'"]
    restart: "no"
```

And add the volume:

```yaml
volumes:
  postgres_data:
  es_data:
  ollama_data:
```

> The `ollama-model-pull` one-shot container guarantees the `llama3.2` model is present before any service consumes it. Subsequent `up -d` runs are no-ops because the model is cached in the `ollama_data` volume.

#### `docker-compose.services.yml` — add the recommendations service

Replace the existing `ai-service` block (currently `build: ./apps/ai-service` with `OPENAI_API_KEY`) with the recommendations-ai-service block, and update the gateway environment so its third route URI matches the renamed service:

```yaml
  gateway:
    build: ./apps/ecommerce-gateway
    ports:
      - "8080:8080"
    depends_on:
      - product-service
      - order-service
      - recommendations-ai-service
    environment:
      SPRING_CLOUD_GATEWAY_ROUTES_0_URI: http://product-service:8081
      SPRING_CLOUD_GATEWAY_ROUTES_1_URI: http://order-service:8082
      SPRING_CLOUD_GATEWAY_ROUTES_2_URI: http://recommendations-ai-service:8083

  recommendations-ai-service:
    build: ./apps/recommendations-ai-service
    ports:
      - "8083:8083"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ecommerce
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      SPRING_AI_OLLAMA_BASE_URL: http://ollama:11434
      SPRING_AI_OLLAMA_CHAT_OPTIONS_MODEL: llama3.2
```

> The base service name in `docker-compose.services.yml` (currently `ai-service`) is renamed to `recommendations-ai-service` to match the build context. Internal DNS for inter-service calls becomes `http://recommendations-ai-service:8083`.

#### `Dockerfile`

A simple multi-stage build using the Gradle wrapper baked into the repo:

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace
COPY . .
RUN ./gradlew --no-daemon bootJar -x test

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
EXPOSE 8083
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

---

## Acceptance criteria — Phase 7

| #  | Criterion |
|----|-----------|
| 1  | `docker compose -f docker-compose.infra.yml up -d` brings up Postgres + Elasticsearch + Kafka + **Ollama**, and the `ollama-model-pull` job exits 0 after pulling `llama3.2`. |
| 2  | `curl http://localhost:11434/api/tags` lists `llama3.2` once the pull job completes. |
| 3  | `./gradlew bootRun --args='--spring.profiles.active=local'` from `apps/recommendations-ai-service/` starts the service on port 8083 with no errors and connects to Ollama. |
| 4  | Flyway applies `V1__create_ai_history_schema.sql` on first start and creates `ai_history.user_orders` and `ai_history.user_order_items`. Subsequent starts are a no-op. |
| 5  | `GET http://localhost:8083/actuator/health` returns `{"status":"UP"}`. |
| 6  | After placing an order via the Cart MFE / Order Service, a row appears in `ai_history.user_orders` with the matching `order_id` and one row per item in `ai_history.user_order_items`. |
| 7  | Replaying the same `OrderCreatedEvent` (same `event_id`) does **not** duplicate rows (idempotency via `event_id UNIQUE`). |
| 8  | `GET http://localhost:8083/api/ai/recommendations/1` returns `200` with a `RecommendationResponse` whose `recommendations.length <= 3` and includes a non-empty `insights` string. |
| 9  | Through the API Gateway: `GET http://localhost:8080/api/ai/recommendations/1` returns the same payload as the direct call. |
| 10 | The recommendations reference categories or themes derivable from the user's actual order history (manual sanity check — no determinism guarantee from the LLM). |
| 11 | When Ollama is unreachable, `GET /api/ai/recommendations/{userId}` returns `502 RECOMMENDATION_FAILED` rather than a 500 stack trace. |
| 12 | `./gradlew test` is green: unit tests for `OrderHistoryService`, `RecommendationService`, and `OrderEventConsumer`, plus the Testcontainers integration test for the consumer flow. |
| 13 | End-to-end via Docker only: `docker compose -f docker-compose.infra.yml up -d && docker compose -f docker-compose.services.yml up -d` starts every service; placing an order through the Cart MFE results in a recommendation when calling the gateway endpoint. |
| 14 | `recommendations-ai-service` container survives a Kafka restart (consumer reconnects automatically). |

---

## Out of scope for this spec

- Catalog / Shell MFE UI surfacing of recommendations (Phase 8)
- Replacing Ollama with a hosted LLM (OpenAI, Anthropic, etc.)
- Vector embeddings / RAG over the product catalog
- Authentication on `/api/ai/recommendations/{userId}`
- Persisting generated recommendations or caching LLM responses
- Streaming chat responses or function calling
- Dead-letter topic / retry topology for poisoned events
- GPU acceleration for Ollama (CPU inference is acceptable for the PoC)
- Prompt-injection defenses on `productName` strings echoed into the prompt
