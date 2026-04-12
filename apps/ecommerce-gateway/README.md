# ecommerce-gateway

The API Gateway is the single entry point for all browser traffic in the ecommerce EDA platform. It is a reactive Spring Cloud Gateway that proxies requests to backend services, enforces CORS for the micro-frontend origins, and propagates a correlation ID through every request/response pair.

## Tech stack

| Component | Version |
|---|---|
| Java | 21 |
| Spring Boot | 3.3.0 |
| Spring Cloud | 2023.0.1 |
| Spring Cloud Gateway | via `spring-cloud-starter-gateway` (WebFlux-based) |
| Spring Boot Actuator | via `spring-boot-starter-actuator` |
| Gradle | 8.7 |

> Spring Cloud Gateway is built on WebFlux. `spring-boot-starter-web` must not be added — it is incompatible with a reactive gateway.

## Prerequisites

- Java 21
- No infrastructure dependencies (the gateway itself does not connect to PostgreSQL, Kafka, or Elasticsearch)
- Backend services running on their respective ports if you intend to proxy real traffic (`:8081`, `:8082`, `:8083`)

## Running locally

All commands run from the `apps/ecommerce-gateway/` directory.

```bash
# Run with local profile (enables DEBUG logging for gateway and application packages)
./gradlew bootRun --args='--spring.profiles.active=local'

# Build (produces build/libs/ecommerce-gateway-0.0.1-SNAPSHOT.jar)
./gradlew build

# Health check
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

## Running via Docker Compose (full stack)

Infrastructure services must be started first from the repo root:

```bash
# 1. Start PostgreSQL, Elasticsearch, and Kafka
docker compose -f docker-compose.infra.yml up -d

# 2. Start all application services including the gateway
docker compose -f docker-compose.services.yml up -d
```

When running in Docker Compose, the route URIs are overridden via environment variables to use Docker service names instead of `localhost`:

| Environment variable | Value |
|---|---|
| `SPRING_CLOUD_GATEWAY_ROUTES_0_URI` | `http://product-service:8081` |
| `SPRING_CLOUD_GATEWAY_ROUTES_1_URI` | `http://order-service:8082` |
| `SPRING_CLOUD_GATEWAY_ROUTES_2_URI` | `http://ai-service:8083` |

## Configuration

### Spring profiles

| Profile | Effect |
|---|---|
| (default) | Standard INFO logging |
| `local` | DEBUG logging for `org.springframework.cloud.gateway` and `com.ecommerce.gateway` |

### Routes

Defined in `src/main/resources/application.yml`. The gateway exposes port `8080` and forwards to backend services on `localhost` by default.

| Route ID | Inbound predicate | Upstream URI | Notes |
|---|---|---|---|
| `product-service` | `POST /graphql` | `http://localhost:8081` | GraphQL API; path is preserved via `RewritePath` filter |
| `order-service` | `/api/orders/**` | `http://localhost:8082` | REST; all sub-paths forwarded as-is |
| `ai-service` | `/api/ai/**` | `http://localhost:8083` | REST; all sub-paths forwarded as-is |

### CORS

Global CORS is configured under `spring.cloud.gateway.globalcors` and applies to all paths (`/**`).

| Setting | Value |
|---|---|
| Allowed origins | `http://localhost:3000`, `http://localhost:3001`, `http://localhost:3002` |
| Allowed methods | GET, POST, PUT, DELETE, OPTIONS |
| Allowed headers | `*` (all headers) |
| Allow credentials | `true` |

Requests from origins outside this list do not receive `Access-Control-Allow-Origin` in the response.

### Actuator endpoints

The following actuator endpoints are exposed over HTTP:

```
GET /actuator/health
GET /actuator/info
GET /actuator/metrics
```

## Key design decisions

**Reactive (WebFlux) runtime.** Spring Cloud Gateway runs on Project Reactor / Netty rather than a blocking servlet container. This makes it well-suited for high-concurrency proxying with minimal thread overhead.

**Correlation ID propagation.** Every request receives an `X-Correlation-Id` header before it reaches a downstream service. If the inbound request already carries the header (non-blank), it is preserved; otherwise a random UUID is generated. The resolved value is also added to the response, enabling end-to-end request tracing across services without a service mesh.

**YAML-driven routes.** Routes are declared declaratively in `application.yml` rather than in Java `RouteLocator` beans. Environment variables override the upstream URIs when running in Docker, so no code changes are needed between local and containerised deployments.

**No authentication at this stage.** Auth/authorization (Keycloak OIDC) and resilience patterns (circuit breaking, rate limiting via Resilience4j) are out of scope for the current PoC phase and will be added in later phases.

## Project structure

```
apps/ecommerce-gateway/
├── build.gradle
├── settings.gradle
└── src/
    └── main/
        ├── java/com/ecommerce/gateway/
        │   ├── GatewayApplication.java          # Spring Boot entry point
        │   └── filter/
        │       └── CorrelationIdFilter.java      # GlobalFilter — injects X-Correlation-Id
        └── resources/
            ├── application.yml                  # Routes, CORS, server port, actuator
            └── application-local.yml            # DEBUG logging overrides
```

## Testing

```bash
# Run all tests
./gradlew test
```

Test dependencies include `spring-boot-starter-test` and `reactor-test` (for StepVerifier and reactive assertions).

### Manual acceptance checks

```bash
# AC-1: Gateway starts and is healthy
curl http://localhost:8080/actuator/health

# AC-3: GraphQL query proxied to Product Service (:8081)
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ products { id name } }"}'

# AC-4: Orders endpoint proxied to Order Service (:8082)
curl -X POST http://localhost:8080/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId":"...","quantity":1}'

# AC-5: AI recommendations proxied to AI Service (:8083)
curl http://localhost:8080/api/ai/recommendations/1

# AC-6: Correlation ID generated when absent
curl -v http://localhost:8080/actuator/health
# Response must include X-Correlation-Id header with a UUID

# AC-7: Caller-supplied correlation ID preserved
curl -v -H "X-Correlation-Id: my-trace-id" http://localhost:8080/actuator/health
# Response X-Correlation-Id must equal "my-trace-id"

# AC-8: CORS preflight from allowed origin succeeds
curl -v -X OPTIONS http://localhost:8080/graphql \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST"
# Response must be 200 with Access-Control-Allow-Origin: http://localhost:3001

# AC-9: CORS preflight from disallowed origin rejected
curl -v -X OPTIONS http://localhost:8080/graphql \
  -H "Origin: http://localhost:4000" \
  -H "Access-Control-Request-Method: POST"
# Response must not contain Access-Control-Allow-Origin
```
