# Tasks — Phase 7 (Recommendations AI Service)

**Spec:** `SPEC.md`
**Design doc:** `docs/DESIGN_DOC.md` (Phase 7, sections 3.4, 5.3, and 6)
**Last updated:** 2026-05-01

Check off each task as it is completed. Tasks are ordered by implementation sequence — dependencies flow top-to-bottom within each section. The directory `apps/recommendations-ai-service/` does **not** exist yet and must be created from scratch.

---

## Phase 7 — Recommendations AI Service

### 7.1 Project scaffold

- [ ] Create the directory `apps/recommendations-ai-service/`
- [ ] Copy or generate the Gradle wrapper (`gradlew`, `gradlew.bat`, `gradle/wrapper/`) from a peer service (e.g. `apps/product-service/`) so `./gradlew` works locally
- [ ] Create `settings.gradle` with `rootProject.name = 'recommendations-ai-service'`
- [ ] Create `build.gradle` from SPEC.md §`build.gradle`:
  - [ ] Plugins: `java`, `org.springframework.boot 3.3.5`, `io.spring.dependency-management 1.1.6`
  - [ ] Java toolchain `21`
  - [ ] Spring AI BOM at `1.0.0`
  - [ ] Dependencies: `spring-boot-starter-web`, `-validation`, `-data-jpa`, `-actuator`, `spring-kafka`, `flyway-core`, `flyway-database-postgresql`, `spring-ai-starter-model-ollama`, `postgresql` (runtime), Lombok
  - [ ] Test deps: `spring-boot-starter-test`, `spring-kafka-test`, `testcontainers:junit-jupiter`, `testcontainers:postgresql`, `testcontainers:kafka`
- [ ] Create `src/main/java/com/commerce/recommendations/RecommendationsApplication.java` with `@SpringBootApplication`
- [ ] Run `./gradlew build -x test` and verify the project compiles

### 7.2 Configuration

- [ ] Create `src/main/resources/application.yml` from SPEC.md §Configuration:
  - [ ] `spring.application.name = recommendations-ai-service`
  - [ ] Datasource for Postgres (`jdbc:postgresql://localhost:5432/ecommerce`, user/pass `ecommerce`)
  - [ ] JPA `ddl-auto: validate`, `default_schema: ai_history`, `open-in-view: false`
  - [ ] Flyway `schemas: ai_history`, `baseline-on-migrate: true`
  - [ ] Kafka consumer with `group-id: recommendations-ai-service`, `auto-offset-reset: earliest`, `JsonDeserializer` value, `spring.json.use.type.headers: false`, `spring.json.value.default.type: com.commerce.recommendations.dto.OrderCreatedEvent`
  - [ ] `spring.ai.ollama.base-url = http://localhost:11434` and `chat.options.model = llama3.2`, `temperature: 0.4`
  - [ ] `recommendations.kafka.topic = order.created`
  - [ ] `recommendations.prompt.max-history-orders = 10`, `max-recommendations = 3`
  - [ ] `server.port = 8083`
  - [ ] Actuator `health,info,metrics` exposed
- [ ] Create `src/main/resources/application-local.yml` with DEBUG logging for `com.commerce.recommendations` and `org.springframework.ai`

### 7.3 Database migration

- [ ] Create directory `src/main/resources/db/migration/`
- [ ] Create `V1__create_ai_history_schema.sql`:
  - [ ] `CREATE SCHEMA IF NOT EXISTS ai_history;`
  - [ ] `ai_history.user_orders` with `id`, `event_id UUID UNIQUE`, `order_id`, `user_id`, `total`, `ordered_at`, `consumed_at`
  - [ ] Indexes `idx_user_orders_user_id` and `idx_user_orders_order_id`
  - [ ] `ai_history.user_order_items` with FK to `user_orders` (`ON DELETE CASCADE`), `product_id`, `product_name`, `unit_price`, `quantity CHECK > 0`
  - [ ] Index `idx_user_order_items_user_order_id`

### 7.4 Domain model

- [ ] Create `domain/UserOrder.java`:
  - [ ] `@Entity @Table(name = "user_orders", schema = "ai_history")`
  - [ ] `@EntityListeners(AuditingEntityListener.class)`
  - [ ] Fields: `id: UUID`, `eventId: UUID (unique)`, `orderId: UUID`, `userId: Long`, `total: BigDecimal`, `orderedAt: Instant`, `consumedAt: Instant @CreatedDate`, `items: List<UserOrderItem>`
  - [ ] `@OneToMany(mappedBy = "userOrder", cascade = ALL, orphanRemoval = true, fetch = LAZY)`
  - [ ] `addItem(item)` helper that sets the bidirectional link
- [ ] Create `domain/UserOrderItem.java`:
  - [ ] `@Entity @Table(name = "user_order_items", schema = "ai_history")`
  - [ ] Fields: `id: UUID`, `userOrder: UserOrder (@ManyToOne LAZY)`, `productId: UUID`, `productName: String`, `unitPrice: BigDecimal`, `quantity: Integer`

### 7.5 JPA auditing config

- [ ] Create `config/JpaAuditingConfig.java` with `@Configuration` and `@EnableJpaAuditing`

### 7.6 Repository

- [ ] Create `repository/UserOrderRepository.java` extending `JpaRepository<UserOrder, UUID>` with:
  - [ ] `Optional<UserOrder> findByEventId(UUID eventId)`
  - [ ] `List<UserOrder> findAllByUserIdOrderByOrderedAtDesc(Long userId, Pageable pageable)` annotated `@EntityGraph(attributePaths = "items")`
  - [ ] `long countByUserId(Long userId)`

### 7.7 DTOs

- [ ] Create `dto/OrderCreatedEvent.java` (record) with `eventId, orderId, userId, total, items, createdAt`
- [ ] Create `dto/OrderCreatedItem.java` (record) with `productId, productName, unitPrice, quantity`
- [ ] Create `dto/RecommendationResponse.java` (record) with `userId, historyOrdersUsed, insights, recommendations`
- [ ] Create `dto/RecommendedProduct.java` (record) with `productName, category, reason`

### 7.8 Kafka consumer

- [ ] Create `config/KafkaConsumerConfig.java`:
  - [ ] `@EnableKafka`
  - [ ] `ConsumerFactory<String, Object>` bean wrapping `JsonDeserializer` in `ErrorHandlingDeserializer`
  - [ ] `ConcurrentKafkaListenerContainerFactory<String, Object>` bean
- [ ] Create `consumer/OrderEventConsumer.java`:
  - [ ] `@KafkaListener(topics = "${recommendations.kafka.topic}", groupId = "${spring.kafka.consumer.group-id}")`
  - [ ] Method `onOrderCreated(OrderCreatedEvent event)` delegates to `OrderHistoryService.recordOrder`
- [ ] Create `service/OrderHistoryService.java`:
  - [ ] `@Service @Transactional`
  - [ ] `recordOrder(event)` checks `findByEventId` for idempotency, then maps the event to `UserOrder` + items and `save`s

### 7.9 Recommendation service

- [ ] Create `src/main/resources/prompts/recommendation-prompt.st` with the template from SPEC.md §`recommendation-prompt.st`
- [ ] Create `service/RecommendationGenerationException.java` extending `RuntimeException`
- [ ] Create `service/RecommendationService.java`:
  - [ ] Constructor-injected `ChatClient.Builder` and `UserOrderRepository`
  - [ ] `@Value` injection for the prompt resource and `recommendations.prompt.*` properties
  - [ ] `recommend(userId)` annotated `@Transactional(readOnly = true)`:
    - [ ] Loads up to `maxHistoryOrders` orders ordered by `orderedAt DESC`
    - [ ] Renders history items into a bulleted string
    - [ ] Builds prompt via `PromptTemplate` with `{userId}, {orderHistory}, {maxRecommendations}, {format}` (format from `BeanOutputConverter<RecommendationResponse>`)
    - [ ] Calls `chatClient.prompt(prompt).call().content()`
    - [ ] Parses with the converter; throws `RecommendationGenerationException` on null
    - [ ] Caps `recommendations` to `maxRecommendations`
    - [ ] Returns a fresh `RecommendationResponse` with `historyOrdersUsed = history.size()`

### 7.10 REST controller

- [ ] Create `controller/RecommendationController.java`:
  - [ ] `@RestController @RequestMapping("/api/ai/recommendations")`
  - [ ] `GET /{userId}` returning `RecommendationResponse`
- [ ] Create `controller/GlobalExceptionHandler.java`:
  - [ ] `@RestControllerAdvice`
  - [ ] Handle `RecommendationGenerationException` → 502 + `{status, error: "RECOMMENDATION_FAILED", message, timestamp}`

### 7.11 Tests

- [ ] Create `test/java/com/commerce/recommendations/service/OrderHistoryServiceTest.java`:
  - [ ] `@ExtendWith(MockitoExtension.class)`
  - [ ] Mock `UserOrderRepository`
  - [ ] Test `recordOrder` saves a new event
  - [ ] Test `recordOrder` skips when `findByEventId` returns a present value (idempotency)
- [ ] Create `test/java/com/commerce/recommendations/service/RecommendationServiceTest.java`:
  - [ ] Mock `UserOrderRepository`; stub `ChatClient.Builder` so `chatClient.prompt(...).call().content()` returns a canned JSON string
  - [ ] Test history items are rendered into the prompt content (use `ArgumentCaptor`)
  - [ ] Test `maxRecommendations` cap is enforced when the LLM returns more
  - [ ] Test empty history yields a prompt containing `(no previous orders)`
  - [ ] Test unparseable LLM output throws `RecommendationGenerationException`
- [ ] Create `test/java/com/commerce/recommendations/consumer/OrderEventConsumerTest.java`:
  - [ ] Mock `OrderHistoryService`
  - [ ] Test the listener forwards a deserialized event to `recordOrder`
- [ ] Create `test/java/com/commerce/recommendations/integration/OrderEventFlowIntegrationTest.java`:
  - [ ] `@SpringBootTest(webEnvironment = RANDOM_PORT)` + `@Testcontainers`
  - [ ] `PostgreSQLContainer("postgres:16-alpine")`
  - [ ] `KafkaContainer(DockerImageName.parse("apache/kafka:3.7.0"))`
  - [ ] `@DynamicPropertySource` for datasource + Kafka bootstrap
  - [ ] `@TestConfiguration` with a `@Primary` `ChatClient.Builder` bean returning canned JSON (so the test does not require a running Ollama)
  - [ ] Publish an `OrderCreatedEvent` to `order.created` via `KafkaTemplate`
  - [ ] Await up to 10s for `userOrderRepository.countByUserId(1) == 1`
  - [ ] Hit `GET /api/ai/recommendations/1` via `TestRestTemplate`; assert 200 + `historyOrdersUsed = 1` + non-empty `recommendations`
- [ ] Keep `RecommendationsApplicationTests.java` as a basic context-load smoke test

### 7.12 Docker Compose

- [ ] Edit `docker-compose.infra.yml`:
  - [ ] Add an `ollama` service (image `ollama/ollama:latest`, port `11434`, named volume `ollama_data`, healthcheck via `ollama list`)
  - [ ] Add a one-shot `ollama-model-pull` service that depends on `ollama` (healthy) and runs `ollama pull llama3.2`
  - [ ] Add `ollama_data` to the top-level `volumes:` block
- [ ] Edit `docker-compose.services.yml`:
  - [ ] Rename the existing `ai-service` block to `recommendations-ai-service` and update `build` to `./apps/recommendations-ai-service`
  - [ ] Drop `OPENAI_API_KEY`; add `SPRING_DATASOURCE_URL`, `SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092`, `SPRING_AI_OLLAMA_BASE_URL: http://ollama:11434`, `SPRING_AI_OLLAMA_CHAT_OPTIONS_MODEL: llama3.2`
  - [ ] Update the gateway `depends_on` and `SPRING_CLOUD_GATEWAY_ROUTES_2_URI` to reference `recommendations-ai-service`
- [ ] Create `apps/recommendations-ai-service/Dockerfile` (multi-stage `eclipse-temurin:21-jdk` build, `eclipse-temurin:21-jre` runtime, exposes 8083)
- [ ] Run `docker compose -f docker-compose.infra.yml up -d` and confirm `ollama-model-pull` exits 0 (model cached in `ollama_data`)

### 7.13 Acceptance checks (Phase 7)

- [ ] **AC-1** `docker compose -f docker-compose.infra.yml up -d` starts Postgres + Elasticsearch + Kafka + **Ollama**, and `ollama-model-pull` exits 0
- [ ] **AC-2** `curl http://localhost:11434/api/tags` lists `llama3.2`
- [ ] **AC-3** `./gradlew bootRun --args='--spring.profiles.active=local'` from `apps/recommendations-ai-service/` starts on port 8083 with no errors
- [ ] **AC-4** Flyway creates `ai_history.user_orders` and `ai_history.user_order_items` on first start; restart is a no-op (verify via `psql -h localhost -U ecommerce -d ecommerce -c '\dt ai_history.*'`)
- [ ] **AC-5** `GET http://localhost:8083/actuator/health` returns `{"status":"UP"}`
- [ ] **AC-6** Placing an order via Cart MFE / Order Service inserts a row in `ai_history.user_orders` plus one per item in `ai_history.user_order_items`
- [ ] **AC-7** Replaying the same `event_id` does **not** duplicate rows
- [ ] **AC-8** `GET http://localhost:8083/api/ai/recommendations/1` returns `200` with `recommendations.length <= 3` and a non-empty `insights` string
- [ ] **AC-9** Through the gateway: `GET http://localhost:8080/api/ai/recommendations/1` returns the same payload
- [ ] **AC-10** Manual sanity check: recommendation reasons reference categories or themes from the user's actual order history
- [ ] **AC-11** With Ollama stopped, `GET /api/ai/recommendations/{userId}` returns `502 RECOMMENDATION_FAILED` (no 500 stack trace)
- [ ] **AC-12** `./gradlew test` from `apps/recommendations-ai-service/` is green (unit + slice + Testcontainers integration)
- [ ] **AC-13** End-to-end Docker run: `docker compose -f docker-compose.infra.yml up -d && docker compose -f docker-compose.services.yml up -d` brings up every service; placing an order via Cart MFE → gateway results in a recommendation when calling the gateway endpoint
- [ ] **AC-14** Restarting the Kafka container does not require restarting `recommendations-ai-service` (consumer reconnects automatically)
