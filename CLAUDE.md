# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **phase-gated PoC** of an event-driven e-commerce platform using micro-frontends (MFE). See `docs/DESIGN_DOC.md` for the full 8-phase roadmap and `docs/PRD.md` for product requirements.

**Current status:** Phase 2 complete — Product Service is implemented. Phase 3 (API Gateway) is next.

## Infrastructure & Development

### Start infrastructure (required before running any service)

```bash
docker compose up -d
```

Starts PostgreSQL 16 (5432), Elasticsearch 8.13 (9200), and Kafka 3.7 with KRaft (9092).

### Product Service (apps/product-service)

```bash
# Run with local profile (enables GraphiQL, seeds 100 products)
./gradlew bootRun --args='--spring.profiles.active=local'

# Build
./gradlew build

# Run all tests
./gradlew test

# Check health
curl http://localhost:8081/actuator/health
```

GraphiQL is available at `http://localhost:8081/graphiql` when running with the `local` profile.

## Architecture

```
Browser (Shell :3000 | Catalog MFE :3001 | Cart MFE :3002)
                        ↓
             API Gateway :8080 (Spring Cloud Gateway)
          ↙              ↓              ↘
Product Service    Order Service    AI Service
   :8081              :8082            :8083
     ↓                  ↓
PostgreSQL            Kafka ←→ AI Service (consumer)
     ↓
Elasticsearch
```

**Service responsibilities:**
- **Product Service** (Java 21, Spring Boot 3.3) — GraphQL API, product catalog, Elasticsearch indexing
- **Order Service** (Kotlin, Spring Boot 4.x) — REST API, publishes `order.created` Kafka events
- **AI Service** (Java, Spring AI) — Consumes order events, provides AI recommendations
- **API Gateway** (Spring Cloud Gateway, reactive) — Routing, CORS for MFE origins
- **MFEs** (React 18, TypeScript 5, Webpack 5 Module Federation) — Shell host + Catalog/Cart remotes

## Key Design Decisions

- **GraphQL for Product Service only** — variable access patterns; other services use REST
- **Elasticsearch for search, PostgreSQL for canonical data** — ES documents are hydrated from Postgres post-query
- **Shared PostgreSQL with separate schemas** (`product`, `order`, `ai_history`) — simplifies PoC, splittable later
- **Kafka with KRaft** — no Zookeeper dependency
- **Choreography-based events** — services react to Kafka topics asynchronously
- **Flyway owns schema migrations** — Hibernate is set to `validate`, never `update`

## Code Patterns

**Java / Spring:**
- Constructor injection throughout; Lombok `@RequiredArgsConstructor` where applicable
- JPA auditing via `@CreatedDate` / `@LastModifiedDate`
- Service layer owns transactional boundaries; queries use `@Transactional(readOnly = true)`
- Java records for DTOs (e.g., `ProductFilter`, `ProductPage`)
- UUID primary keys using `gen_random_uuid()`

**GraphQL:**
- `@QueryMapping` and `@Argument` annotations on controllers
- Schema files in `src/main/resources/graphql/*.graphqls`

**Elasticsearch:**
- `@Document` / `@Field` on separate document classes (not JPA entities)
- `BoolQuery` builder pattern for filters
- Post-ES hydration from Postgres for authoritative data

**Testing:**
- Unit tests: Mockito with `@ExtendWith(MockitoExtension.class)`
- Integration tests: TestContainers
- GraphQL tests: Spring GraphQL test utilities (`@GraphQlTest`)

## Specifications & Tasks

Each phase has a spec and task file under `.specs/`:
- `.specs/001-product-service/SPEC.md` — Phase 2 detailed spec with code examples
- `.specs/001-product-service/TASKS.md` — Actionable checklist with acceptance criteria

## Available Skills

The `.claude/skills/` directory contains specialized agents for this project (invoked via `/skill-name`):

| Skill | Purpose |
|---|---|
| `/java-code-review` | Null safety, exception handling, concurrency |
| `/spring-boot-patterns` | Controllers, services, repositories, REST |
| `/jpa-patterns` | N+1 detection, lazy loading, transactions |
| `/test-quality` | JUnit 5 + AssertJ test writing |
| `/security-audit` | OWASP Top 10 for Java |
| `/design-patterns` | Factory, Builder, Strategy, etc. |
| `/git-commit` | Conventional commit messages |
| `/api-contract-review` | HTTP semantics, versioning |
| `/architecture-review` | Package structure, layering |
| `/performance-smell-detection` | Streams, boxing, object creation |
