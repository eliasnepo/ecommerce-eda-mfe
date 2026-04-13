# E-Commerce EDA MFE

A proof-of-concept e-commerce platform validating a modern architecture stack: **event-driven microservices** with **Kafka**, **GraphQL**, **Elasticsearch**, **Spring AI**, and **Webpack Module Federation** micro-frontends.

## Implemented So Far

- Infrastructure stack is up and reproducible with Docker Compose (PostgreSQL, Elasticsearch, Kafka/KRaft).
- Product Service is live with GraphQL product listing/detail, Elasticsearch-backed search, and PostgreSQL hydration.
- API Gateway routes GraphQL and backend APIs with local MFE-friendly CORS settings.
- Catalog MFE is implemented with product listing, search, category filtering, price sorting, pagination, and product detail page.
- Catalog quality improvements include USD price formatting, consistent card/image sizing, long-name truncation with hover full name, and Store section removal.
- Product search now supports typo-tolerant fuzzy matching and explicit sort modes (`RELEVANCE`, `PRICE_ASC`, `PRICE_DESC`).
- Local product seeding now prefers curated real external images with deterministic selection and placeholder fallback.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                 Browser / Client                 │
│  Shell (host :3000)  │  Catalog MFE  │  Cart MFE │
│                      │    (:3001)    │   (:3002) │
└─────────────────────────────────────────────────-┘
                        │ HTTP
             ┌──────────▼──────────┐
             │    API Gateway      │  :8080
             │ Spring Cloud Gateway│
             └──┬──────────┬───┬───┘
                │ GraphQL  │   │ REST
                ▼          ▼   ▼
       ┌──────────┐ ┌──────────┐ ┌──────────┐
       │ Product  │ │  Order   │ │    AI    │
       │ Service  │ │ Service  │ │ Service  │
       │  :8081   │ │  :8082   │ │  :8083   │
       └────┬─────┘ └────┬─────┘ └────┬─────┘
            │ES index    │pub          │sub
            ▼            ▼            ▼
       ┌──────────┐ ┌──────────────────────┐
       │Elastic   │ │        Kafka         │
       │search    │ │   (order.created)    │
       └──────────┘ └──────────────────────┘
                ↕ canonical data
           PostgreSQL (shared, per-service schemas)
```

**Key design decisions:**
- GraphQL is used only on the Product Service (variable access patterns); other services expose REST
- Elasticsearch handles search; PostgreSQL is the canonical data store — results are hydrated from Postgres post-ES query
- PostgreSQL uses separate schemas per service (`product`, `order`, `ai_history`) for loose coupling, splittable to separate databases later
- Kafka runs in KRaft mode (no Zookeeper)
- MFEs communicate via cross-MFE custom events or a shared Zustand store; direct imports between remotes are avoided

## Services

| Service | Port | Tech | Status |
|---|---|---|---|
| API Gateway | 8080 | Spring Cloud Gateway (reactive) | **Implemented** |
| Product Service | 8081 | Spring Boot 3.3, GraphQL, Elasticsearch, PostgreSQL | **Implemented** |
| Order Service | 8082 | Spring Boot 4.x, Kotlin, Kafka producer, PostgreSQL | Planned (Phase 6) |
| AI Service | 8083 | Spring Boot 4.x, Spring AI, Kafka consumer | Planned (Phase 7) |
| Shell MFE | 3000 | React 18, Webpack 5 Module Federation host | Planned (Phase 5) |
| Catalog MFE | 3001 | React 18, TypeScript 5, GraphQL Request, Vite Module Federation remote | **Implemented** |
| Cart MFE | 3002 | React 18, Axios, Module Federation remote | Planned (Phase 5) |

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Java 21
- Gradle 8.x (or use the included wrapper)
- Node.js 20+

### 1. Start infrastructure

```bash
docker compose -f docker-compose.infra.yml up -d
```

Starts PostgreSQL 16 (5432), Elasticsearch 8.13 (9200), and Kafka 3.7 (9092).

### 2. Run the API Gateway

```bash
cd apps/ecommerce-gateway
./gradlew bootRun --args='--spring.profiles.active=local'
```

**Verify:**
```bash
curl http://localhost:8080/actuator/health
```

### 3. Run the Product Service

```bash
cd apps/product-service
./gradlew bootRun --args='--spring.profiles.active=local'
```

The `local` profile seeds the database with 100 sample products and enables GraphiQL.

**Verify:**
```bash
curl http://localhost:8081/actuator/health
```

GraphiQL is available at `http://localhost:8081/graphiql` (direct) or proxied through the gateway at `http://localhost:8080/graphql`.

### 4. Run the Catalog MFE

```bash
cd apps/mfe-catalog
npm install
npm run dev
```

Catalog MFE runs at `http://localhost:3001`.

### Sample GraphQL query

```graphql
query {
  products(filter: { query: "wirels", category: "Electronics", maxPrice: 150, sortBy: PRICE_ASC }, page: 0, size: 10) {
    content {
      id
      name
      price
      category
    }
    totalElements
    totalPages
  }
}
```

## Data Flows

**Product search:**
Catalog MFE → GraphQL → Gateway → Product Service → Elasticsearch → hydrate from PostgreSQL → response

**Order placement:**
Cart MFE → `POST /api/orders` → Gateway → Order Service → PostgreSQL + Kafka `order.created` → (async) AI Service updates user history

**AI recommendations:**
Catalog MFE → `GET /api/ai/recommendations/{userId}` → Gateway → AI Service → load order history → Spring AI prompt → LLM → ranked suggestions

## Technology Stack

| Layer | Technology |
|---|---|
| Backend language | Java 21 / Kotlin |
| Framework | Spring Boot 3.3 → 4.x |
| GraphQL | Spring for GraphQL |
| Search | Spring Data Elasticsearch 8.13 |
| Messaging | Spring Kafka + Apache Kafka 3.7 (KRaft) |
| AI | Spring AI 1.0.x |
| Database | PostgreSQL 16 + Flyway migrations |
| API Gateway | Spring Cloud Gateway |
| Frontend | React 18, TypeScript 5, Webpack 5 Module Federation |
| GraphQL client | GraphQL Request |
| Styling | Tailwind CSS 3.x |

## Implementation Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Docker Compose infrastructure | Done |
| 2 | Product Service (GraphQL + ES + PostgreSQL) | **Done** |
| 3 | API Gateway (routing + CORS) | **Done** |
| 4 | Catalog MFE (product listing + search) | **Done** |
| 5 | Shell + Cart MFE (Module Federation host) | Planned |
| 6 | Order Service (REST + Kafka producer) | Planned |
| 7 | AI Service (Kafka consumer + Spring AI) | Planned |
| 8 | Integration, health checks, v0.1.0-poc tag | Planned |

See [`docs/DESIGN_DOC.md`](docs/DESIGN_DOC.md) for the full architecture specification and [`docs/PRD.md`](docs/PRD.md) for product requirements. Per-phase implementation specs are in [`.specs/`](.specs/).

## PoC Acceptance Criteria

- [x] Search for a product by keyword → results from Elasticsearch
- [x] View product details via GraphQL query
- [ ] Add to cart and place an order
- [ ] Order placement publishes an event consumed by the AI Service via Kafka
- [ ] AI Service returns product recommendations based on order history
- [ ] Shell loads both MFEs lazily without a full page reload
- [ ] All services start with `docker compose -f docker-compose.infra.yml up -d && docker compose -f docker-compose.services.yml up -d` and pass `/actuator/health`

## Out of Scope (PoC)

Payment processing, OAuth2/OIDC authentication, mobile apps, inventory management, multi-region deployment, and distributed saga transactions are deferred to a future production phase.
