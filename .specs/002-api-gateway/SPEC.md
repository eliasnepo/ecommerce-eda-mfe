# Implementation Spec — Phase 3 (API Gateway)

**Status:** Ready for implementation  
**Design doc:** `docs/DESIGN_DOC.md`  
**Last updated:** 2026-04-11

---

## Phase 3 — API Gateway

### Goal

Stand up a reactive Spring Cloud Gateway that acts as the single entry point for all client traffic. It must route requests to the three backend services, inject a correlation ID on every request, and allow cross-origin requests from the MFE origins.

### Location

`apps/ecommerce-gateway/`

---

### Project structure

```
apps/ecommerce-gateway/
├── build.gradle
├── settings.gradle
└── src/
    └── main/
        ├── java/com/ecommerce/gateway/
        │   ├── GatewayApplication.java
        │   └── filter/
        │       └── CorrelationIdFilter.java    ← GlobalFilter — injects X-Correlation-Id
        └── resources/
            ├── application.yml
            └── application-local.yml
```

---

### `settings.gradle`

```groovy
rootProject.name = 'ecommerce-gateway'
```

---

### `build.gradle`

```groovy
plugins {
    id 'org.springframework.boot' version '3.3.0'
    id 'io.spring.dependency-management' version '1.1.5'
    id 'java'
}

group = 'com.ecommerce'
version = '0.0.1-SNAPSHOT'
sourceCompatibility = '21'

repositories {
    mavenCentral()
}

ext {
    set('springCloudVersion', '2023.0.1')
}

dependencies {
    implementation 'org.springframework.cloud:spring-cloud-starter-gateway'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'io.projectreactor:reactor-test'
}

dependencyManagement {
    imports {
        mavenBom "org.springframework.cloud:spring-cloud-dependencies:${springCloudVersion}"
    }
}
```

> **Note:** Spring Cloud Gateway is WebFlux-based (reactive). Do **not** add `spring-boot-starter-web` — it is incompatible.

---

### Configuration

**`src/main/resources/application.yml`**

```yaml
spring:
  application:
    name: ecommerce-gateway

  cloud:
    gateway:
      routes:
        - id: product-service
          uri: http://localhost:8081
          predicates:
            - Path=/graphql
          filters:
            - RewritePath=/graphql, /graphql

        - id: order-service
          uri: http://localhost:8082
          predicates:
            - Path=/api/orders/**

        - id: ai-service
          uri: http://localhost:8083
          predicates:
            - Path=/api/ai/**

      globalcors:
        corsConfigurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:3000"
              - "http://localhost:3001"
              - "http://localhost:3002"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
            allowedHeaders: "*"
            allowCredentials: true

server:
  port: 8080

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

**`src/main/resources/application-local.yml`**

```yaml
logging:
  level:
    org.springframework.cloud.gateway: DEBUG
    com.ecommerce.gateway: DEBUG
```

---

### Application entry point

**`GatewayApplication.java`**

```java
package com.ecommerce.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```

---

### Correlation ID filter

Every inbound request must carry an `X-Correlation-Id` header when it reaches a downstream service. If the client already provided one, it is preserved; otherwise a new UUID is generated. The same value is echoed back on the response.

**`filter/CorrelationIdFilter.java`**

```java
package com.ecommerce.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest()
                .getHeaders()
                .getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        String resolvedId = correlationId;

        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                .header(CORRELATION_ID_HEADER, resolvedId)
                .build();

        exchange.getResponse().getHeaders().add(CORRELATION_ID_HEADER, resolvedId);

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
```

---

### `docker-compose.services.yml` (repo root)

This file was introduced as an empty placeholder in Phase 1. In Phase 3 it is populated with all application services. Infrastructure services (`postgres`, `elasticsearch`, `kafka`) remain in `docker-compose.infra.yml` and are started separately.

```yaml
version: '3.9'
services:

  gateway:
    build: ./apps/ecommerce-gateway
    ports:
      - "8080:8080"
    depends_on:
      - product-service
      - order-service
      - ai-service
    environment:
      SPRING_CLOUD_GATEWAY_ROUTES_0_URI: http://product-service:8081
      SPRING_CLOUD_GATEWAY_ROUTES_1_URI: http://order-service:8082
      SPRING_CLOUD_GATEWAY_ROUTES_2_URI: http://ai-service:8083

  product-service:
    build: ./apps/product-service
    ports:
      - "8081:8081"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ecommerce
      SPRING_ELASTICSEARCH_URIS: http://elasticsearch:9200

  order-service:
    build: ./apps/order-service
    ports:
      - "8082:8082"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/ecommerce
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092

  ai-service:
    build: ./apps/ai-service
    ports:
      - "8083:8083"
    environment:
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      OPENAI_API_KEY: ${OPENAI_API_KEY}
```

To start the full stack locally:

```bash
# 1. Start infrastructure first
docker compose -f docker-compose.infra.yml up -d

# 2. Start application services
docker compose -f docker-compose.services.yml up -d
```

> **Note:** For local development (running services directly on the host via `./gradlew bootRun`), the `application.yml` routes use `localhost` URIs. The `docker-compose.services.yml` environment variables override them so containers resolve each other by Docker service name.

---

## Acceptance criteria — Phase 3

| # | Criterion |
|---|-----------|
| 1 | `./gradlew bootRun` from `apps/ecommerce-gateway/` starts the gateway on port 8080 without errors. |
| 2 | `GET http://localhost:8080/actuator/health` returns `{"status":"UP"}`. |
| 3 | A GraphQL query sent to `POST http://localhost:8080/graphql` is proxied to Product Service (`:8081`) and returns product data. |
| 4 | `POST http://localhost:8080/api/orders` is proxied to Order Service (`:8082`). |
| 5 | `GET http://localhost:8080/api/ai/recommendations/{userId}` is proxied to AI Service (`:8083`). |
| 6 | Any request that does **not** include `X-Correlation-Id` receives one (UUID) on the response header. |
| 7 | Any request that includes `X-Correlation-Id` has the **same** value forwarded to the downstream service and echoed on the response. |
| 8 | An `OPTIONS` preflight from `http://localhost:3001` receives a `200` response with the correct `Access-Control-Allow-Origin` header. |
| 9 | A request from an origin **not** in the allow-list (e.g., `http://localhost:4000`) does **not** receive `Access-Control-Allow-Origin`. |

---

## Out of scope for this spec

- Authentication / authorization (future: Keycloak OIDC)
- Rate limiting / circuit breaking (future: Resilience4j)
- Service discovery (future: Eureka / Kubernetes Services)
- Order Service and AI Service implementations (Phases 6–7)
- Frontend MFEs (Phases 4–5)
