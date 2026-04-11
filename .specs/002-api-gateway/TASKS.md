# Tasks — Phase 3 (API Gateway)

**Spec:** `SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**Last updated:** 2026-04-11

Check off each task as it is completed. Tasks are ordered by implementation sequence — dependencies flow top-to-bottom within each section.

---

## Phase 3 — API Gateway

### 3.1 Project scaffold

- [x] Create directory `apps/ecommerce-gateway/`
- [x] Create `apps/ecommerce-gateway/settings.gradle`
  ```groovy
  rootProject.name = 'ecommerce-gateway'
  ```
- [x] Create `apps/ecommerce-gateway/build.gradle` with:
  - Spring Boot `3.3.0` plugin + `io.spring.dependency-management 1.1.5`
  - `sourceCompatibility = '21'`
  - `springCloudVersion = '2023.0.1'` in `ext`
  - `dependencyManagement` block importing `spring-cloud-dependencies` BOM
  - Dependencies: `spring-cloud-starter-gateway`, `spring-boot-starter-actuator`, `spring-boot-starter-test` (test), `reactor-test` (test)
  - **Do not** add `spring-boot-starter-web` — incompatible with WebFlux gateway

### 3.2 Application entry point

- [x] Create `src/main/java/com/ecommerce/gateway/GatewayApplication.java`
  - Annotate with `@SpringBootApplication`
  - Standard `main` method

### 3.3 Configuration files

- [x] Create `src/main/resources/application.yml` with:
  - `spring.application.name: ecommerce-gateway`
  - Server port: `8080`
  - Three routes:
    - `product-service` — predicate `Path=/graphql`, URI `http://localhost:8081`
    - `order-service` — predicate `Path=/api/orders/**`, URI `http://localhost:8082`
    - `ai-service` — predicate `Path=/api/ai/**`, URI `http://localhost:8083`
  - Global CORS under `spring.cloud.gateway.globalcors.corsConfigurations.'[/**]'`:
    - `allowedOrigins`: `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002`
    - `allowedMethods`: GET, POST, PUT, DELETE, OPTIONS
    - `allowedHeaders: "*"`
    - `allowCredentials: true`
  - Actuator endpoints exposed: `health`, `info`, `metrics`
- [x] Create `src/main/resources/application-local.yml` with:
  - Logging `DEBUG` for `org.springframework.cloud.gateway` and `com.ecommerce.gateway`

### 3.4 Correlation ID filter

- [x] Create `src/main/java/com/ecommerce/gateway/filter/CorrelationIdFilter.java`
  - `@Component`, implements `GlobalFilter` and `Ordered`
  - Constant: `CORRELATION_ID_HEADER = "X-Correlation-Id"`
  - `filter()`:
    - Read `X-Correlation-Id` from incoming request headers
    - If absent or blank, generate a new `UUID.randomUUID().toString()`
    - Mutate the request to include the header before forwarding downstream
    - Add the same value to the response headers
    - Return `chain.filter(mutatedExchange)`
  - `getOrder()` returns `Ordered.HIGHEST_PRECEDENCE` so this filter runs before all others

### 3.5 Docker Compose — services file

- [x] Populate `docker-compose.services.yml` at the repo root (placeholder created in Phase 1) with all four application services:
  - [x] `gateway` — `build: ./apps/ecommerce-gateway`, port `8080`, `depends_on: [product-service, order-service, ai-service]`, environment variables overriding route URIs to Docker service names:
    - `SPRING_CLOUD_GATEWAY_ROUTES_0_URI: http://product-service:8081`
    - `SPRING_CLOUD_GATEWAY_ROUTES_1_URI: http://order-service:8082`
    - `SPRING_CLOUD_GATEWAY_ROUTES_2_URI: http://ai-service:8083`
  - [x] `product-service` — `build: ./apps/product-service`, port `8081`, env: `SPRING_DATASOURCE_URL`, `SPRING_ELASTICSEARCH_URIS`
  - [x] `order-service` — `build: ./apps/order-service`, port `8082`, env: `SPRING_DATASOURCE_URL`, `SPRING_KAFKA_BOOTSTRAP_SERVERS`
  - [x] `ai-service` — `build: ./apps/ai-service`, port `8083`, env: `SPRING_KAFKA_BOOTSTRAP_SERVERS`, `OPENAI_API_KEY`
- [ ] Verify the two-file startup sequence works end-to-end:
  ```bash
  docker compose -f docker-compose.infra.yml up -d
  docker compose -f docker-compose.services.yml up -d
  ```

### 3.6 Acceptance checks (Phase 3)

- [x] **AC-1** `docker compose -f docker-compose.infra.yml up -d` starts Postgres, ES, and Kafka; `./gradlew bootRun` from `apps/ecommerce-gateway/` starts the gateway on port 8080 without errors
- [ ] **AC-2** `GET http://localhost:8080/actuator/health` returns `{"status":"UP"}`
- [ ] **AC-3** `POST http://localhost:8080/graphql` with a valid GraphQL query is proxied to Product Service (`:8081`) and returns product data
- [ ] **AC-4** `POST http://localhost:8080/api/orders` is proxied to Order Service (`:8082`)
- [ ] **AC-5** `GET http://localhost:8080/api/ai/recommendations/1` is proxied to AI Service (`:8083`)
- [ ] **AC-6** Request without `X-Correlation-Id` gets a generated UUID value on the response header
- [ ] **AC-7** Request with `X-Correlation-Id: my-trace-id` has `my-trace-id` forwarded downstream and echoed on the response
- [ ] **AC-8** `OPTIONS` preflight from origin `http://localhost:3001` receives `200` with `Access-Control-Allow-Origin: http://localhost:3001`
- [ ] **AC-9** Request from `http://localhost:4000` does **not** receive `Access-Control-Allow-Origin` header
