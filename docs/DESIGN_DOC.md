# Design Document
## E-Commerce Platform — Microservices Architecture

**Version:** 1.0  
**Status:** Draft  
**Author:** —  
**Last updated:** 2026-04-12

---

## 1. Architecture Overview

The system follows a microservices architecture with a micro-frontend layer on the client side. All client traffic enters through a single API Gateway. Backend services communicate synchronously via HTTP/GraphQL for queries and asynchronously via Kafka for events. Elasticsearch is used exclusively for search — canonical data lives in relational databases.

```
┌─────────────────────────────────────────────────────┐
│                  Browser / Client                   │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Shell (MF   │  │Catalog   │  │ Cart MFE     │  │
│  │  host)       │  │MFE       │  │ (remote)     │  │
│  └──────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────┘
                         │ HTTP
              ┌──────────▼──────────┐
              │    API Gateway      │
              │ Spring Cloud Gateway│
              └──┬──────────┬───┬───┘
                 │          │   │
        GraphQL  │    REST  │   │ REST
                 ▼          ▼   ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Product  │ │ Order    │ │ AI       │
        │ Service  │ │ Service  │ │ Service  │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │ES index    │pub          │sub
             ▼            ▼            ▼
        ┌──────────┐ ┌──────────────────────┐
        │Elastic   │ │       Kafka          │
        │search    │ │  (order.created)     │
        └──────────┘ └──────────────────────┘
```

---

## 2. Technology Stack

### 2.1 Backend

| Layer | Technology | Version (suggested) |
|-------|------------|---------------------|
| Language | Java / Kotlin | 21 (LTS) |
| Framework | Spring Boot | 4.x |
| GraphQL | Spring for GraphQL | included in Boot 4.x |
| Messaging | Spring Kafka + Apache Kafka | Kafka 3.7 |
| Search | Spring Data Elasticsearch | ES 8.x |
| AI | Spring AI | 1.0.x |
| Database | PostgreSQL | 16 |
| API Gateway | Spring Cloud Gateway | 2023.x |
| Service Discovery | Spring Cloud (optional PoC) | — |
| Observability | Spring Boot Actuator + Micrometer | included |
| Build | Maven or Gradle (Gradle recommended) | Gradle 8.x |
| Containerization | Docker + Docker Compose | — |

### 2.2 Frontend

| Layer | Technology | Version (suggested) |
|-------|------------|---------------------|
| Language | TypeScript | 5.x |
| Framework | React | 18.x |
| Bundler | Vite (Catalog MFE), Webpack 5 (Shell/Cart planned) | 5.x |
| Module Federation | `@originjs/vite-plugin-federation` (Catalog), WP5 MF host/remote compatibility | 1.x / 5.x |
| Server state / caching | `@tanstack/react-query` | 5.x |
| Client state | `@tanstack/store` + `@tanstack/react-store` | 0.x |
| GraphQL transport | `graphql-request` | 7.x |
| Routing | `react-router-dom` | 6.x |
| Styling | Tailwind CSS (mandatory for Catalog MFE Phase 4) | 3.x |

### 2.3 Infrastructure (local PoC)

| Component | Image |
|-----------|-------|
| Kafka + KRaft | `apache/kafka:3.7` |
| Elasticsearch | `elasticsearch:8.13.0` |
| PostgreSQL | `postgres:16-alpine` |
| Zipkin (optional) | `openzipkin/zipkin` |

---

## 3. Service Catalogue

### 3.1 API Gateway

**Repository:** `ecommerce-gateway`  
**Port:** `8080`  
**Framework:** Spring Cloud Gateway (reactive)

Responsibilities:
- Route `/graphql` → Product Service (`:8081`)
- Route `/api/orders/**` → Order Service (`:8082`)
- Route `/api/ai/**` → AI Service (`:8083`)
- Add correlation IDs to all requests (filter)
- Handle CORS for the MFE shell origins

Key configuration (`application.yml` sketch):
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: product-service
          uri: http://product-service:8081
          predicates:
            - Path=/graphql
        - id: order-service
          uri: http://order-service:8082
          predicates:
            - Path=/api/orders/**
        - id: ai-service
          uri: http://ai-service:8083
          predicates:
            - Path=/api/ai/**
```

---

### 3.2 Product Service

**Repository:** `product-service`  
**Port:** `8081`  
**Tech:** Spring Boot 4, Spring for GraphQL, Spring Data Elasticsearch, PostgreSQL

Responsibilities:
- Manage canonical product data in PostgreSQL.
- Index products in Elasticsearch on create/update.
- Expose a GraphQL schema for querying products.

**Domain model:**
```
Product
  id          UUID (PK)
  name        VARCHAR(255)
  description TEXT
  price       NUMERIC(10,2)
  category    VARCHAR(100)
  imageUrl    VARCHAR(500)
  createdAt   TIMESTAMP
  updatedAt   TIMESTAMP
```

**GraphQL schema (`schema.graphqls`):**
```graphql
type Query {
  products(filter: ProductFilter, page: Int, size: Int): ProductPage!
  product(id: ID!): Product
}

input ProductFilter {
  query: String
  category: String
  minPrice: Float
  maxPrice: Float
}

type Product {
  id: ID!
  name: String!
  description: String
  price: Float!
  category: String
  imageUrl: String
}

type ProductPage {
  content: [Product!]!
  totalElements: Int!
  totalPages: Int!
  currentPage: Int!
}
```

**Elasticsearch index mapping (key fields):**
```json
{
  "mappings": {
    "properties": {
      "name":        { "type": "text", "analyzer": "standard" },
      "description": { "type": "text", "analyzer": "standard" },
      "category":    { "type": "keyword" },
      "price":       { "type": "double" }
    }
  }
}
```

**Key classes:**
- `ProductController` — `@QueryMapping` methods for GraphQL resolvers
- `ProductRepository` — `JpaRepository<Product, UUID>`
- `ProductSearchRepository` — `ElasticsearchRepository<ProductDocument, String>`
- `ProductIndexingService` — syncs Postgres → ES on save
- `ProductDocument` — ES-specific DTO (`@Document(indexName = "products")`)

---

### 3.3 Order Service

**Repository:** `order-service`  
**Port:** `8082`  
**Tech:** Spring Boot 4, Kotlin, Spring Web (REST), Spring Kafka, PostgreSQL

Responsibilities:
- Accept order placement requests from authenticated users.
- Persist orders and line items.
- Publish `OrderCreated` event to Kafka topic `order.created`.
- Expose order history endpoint.

**Domain model:**
```
Order
  id          UUID (PK)
  userId      INT
  status      ENUM(PENDING, CONFIRMED, CANCELLED)
  total       NUMERIC(10,2)
  createdAt   TIMESTAMP

OrderItem
  id          UUID (PK)
  orderId     UUID (FK → Order)
  productId   UUID
  productName VARCHAR(255)
  unitPrice   NUMERIC(10,2)
  quantity    INT
```

**REST endpoints:**
```
POST   /api/orders              → Place a new order
GET    /api/orders/{id}         → Get order by ID
GET    /api/orders/user/{userId}→ List orders by user
```

**Kafka event (`OrderCreated`):**
```json
{
  "eventId":   "uuid",
  "orderId":   "uuid",
  "userId":    123,
  "items": [
    { "productId": "uuid", "productName": "...", "quantity": 2 }
  ],
  "createdAt": "2026-04-11T10:00:00Z"
}
```

**Key classes:**
- `OrderController` — REST endpoints
- `OrderService` — business logic, transaction boundary
- `OrderRepository` — `JpaRepository<Order, UUID>`
- `OrderEventPublisher` — `KafkaTemplate<String, OrderCreatedEvent>`

---

### 3.4 AI Service

**Repository:** `ai-service`  
**Port:** `8083`  
**Tech:** Spring Boot 4, Spring AI, Spring Kafka (consumer), PostgreSQL (user history cache)

Responsibilities:
- Consume `OrderCreated` events and store order history per user.
- Expose a recommendation endpoint that builds a prompt from user history and calls the LLM.
- Return ranked product suggestions with a natural language reason.

**REST endpoints:**
```
GET /api/ai/recommendations/{userId}   → Get recommendations for a user
```

**Kafka consumer:**
```kotlin
@KafkaListener(topics = ["order.created"], groupId = "ai-service")
fun handle(event: OrderCreatedEvent) {
    userHistoryRepository.append(event.userId, event.items)
}
```

**Prompt template (Spring AI `PromptTemplate`):**
```
You are a product recommendation engine for an e-commerce store.

The user has previously ordered:
{orderHistory}

Available product categories: {categories}

Recommend up to 3 products with a short reason for each recommendation.
Respond in JSON format only:
[{"productId":"...","productName":"...","reason":"..."}]
```

**Key classes:**
- `RecommendationController` — REST endpoint
- `RecommendationService` — prompt construction + Spring AI `ChatClient` call
- `UserHistoryRepository` — stores per-user order history
- `OrderEventConsumer` — Kafka listener

**Spring AI configuration:**
```yaml
spring:
  ai:
    openai:           # swap for ollama, anthropic, etc.
      api-key: ${OPENAI_API_KEY}
      chat:
        model: gpt-4o-mini
```

---

## 4. Micro-Frontend Architecture

### 4.1 Shell (host)

**Repository:** `mfe-shell`  
**Port:** `3000`

The Shell is responsible for:
- Rendering the top-level layout (header, navigation, footer).
- Defining the Webpack Module Federation host configuration.
- Lazy-loading Catalog MFE and Cart MFE on route change.
- Providing shared singleton dependencies (React, React DOM, React Router).

**Webpack config sketch:**
```js
new ModuleFederationPlugin({
  name: 'shell',
  remotes: {
    catalogMfe: 'catalogMfe@http://localhost:3001/remoteEntry.js',
    cartMfe:    'cartMfe@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    react:        { singleton: true, requiredVersion: '^18.0.0' },
    'react-dom':  { singleton: true, requiredVersion: '^18.0.0' },
    'react-router-dom': { singleton: true },
  },
})
```

**Lazy loading routes:**
```tsx
const CatalogApp = React.lazy(() => import('catalogMfe/App'));
const CartApp    = React.lazy(() => import('cartMfe/App'));

<Routes>
  <Route path="/catalog/*" element={<Suspense fallback={<Spinner/>}><CatalogApp/></Suspense>}/>
  <Route path="/cart/*"    element={<Suspense fallback={<Spinner/>}><CartApp/></Suspense>}/>
</Routes>
```

### 4.2 Catalog MFE (remote)

**Repository:** `mfe-catalog`  
**Port:** `3001`

Exposes: `./App` — the root catalog component.

Responsibilities:
- Product listing with pagination and loading skeletons.
- Full-text search input (debounced at 300 ms) that queries GraphQL.
- Product detail view.
- "Add to cart" action dispatching a cross-MFE browser event.

Implementation profile (Phase 4 canonical choice):
- Bundler/runtime: Vite 5 + `@originjs/vite-plugin-federation`, exposed entry `remoteEntry.js`.
- Data/query layer: `graphql-request` + TanStack Query hooks (`useProducts`, `useProduct`).
- Local UI/filter state: TanStack Store (`@tanstack/store` + `@tanstack/react-store`).
- Styling: Tailwind CSS with phase-specific tokens from `docs/search_page_design.json`.
- Routing in remote: relative route paths (`index`, `product/:id`) to keep host mount-path flexibility.

Tailwind requirements (Phase 4):
- Tailwind utility classes are mandatory for component styling.
- Theme tokens live in `tailwind.config.ts` and are used via semantic class names (for example `bg-page-bg`, `text-primary-text`, `rounded-card`).
- Keep global CSS to `src/index.css` (`@tailwind base; @tailwind components; @tailwind utilities;`).
- Avoid component-level `.css` files and CSS-in-JS for Catalog UI.

Cross-MFE cart event contract (Catalog -> Shell/Cart):
```ts
// Event name
'cart:add-item'

// Event detail
interface CartAddItemDetail {
  productId: string
  productName: string
  price: number
  quantity: number
}
```

**GraphQL integration:**
Catalog calls the API Gateway endpoint at `http://localhost:8080/graphql` (overrideable via `VITE_GRAPHQL_URL`).

Phase 4 implementation gates:
- `npm run dev` serves Catalog on port `3001` and serves `remoteEntry.js`.
- Product grid loads from Gateway GraphQL with debounced search and category filter re-query.
- Product route renders detail at `product/:id` (relative remote route).
- "Add to cart" dispatches `cart:add-item` with the contract shown above.
- `npm run test`, `npm run typecheck`, and `npm run build` pass; build output includes federation entry.

### 4.3 Cart MFE (remote)

**Repository:** `mfe-cart`  
**Port:** `3002`

Exposes: `./App` — the root cart component.

Responsibilities:
- Display cart items with quantity controls.
- Display order total.
- "Place Order" button calling `POST /api/orders` (via the Gateway).
- Post-order confirmation screen.

**Cross-MFE communication:**
For the PoC, use browser `CustomEvent` messaging on `window` (for example `cart:add-item`) and avoid direct imports between remotes.

---

## 5. Data Flow Diagrams

### 5.1 Product search flow
```
User types in Catalog MFE
  → TanStack Query executes a `graphql-request` call to Gateway (:8080)
  → Gateway routes to Product Service (:8081)
  → ProductController calls ProductSearchRepository
  → Elasticsearch returns hits
  → Results serialized as ProductPage and returned to MFE
```

### 5.2 Order placement flow
```
User clicks "Place Order" in Cart MFE
  → POST /api/orders to Gateway (:8080)
  → Gateway routes to Order Service (:8082)
  → OrderService persists order in PostgreSQL
  → OrderEventPublisher sends OrderCreated to Kafka topic "order.created"
  → Response 201 returned to client
  → (async) AI Service consumes the event and updates user history
```

### 5.3 Recommendation flow
```
Catalog MFE calls GET /api/ai/recommendations/{userId}
  → Gateway routes to AI Service (:8083)
  → RecommendationService loads user history from DB
  → Builds prompt with Spring AI PromptTemplate
  → ChatClient calls configured LLM
  → LLM returns JSON list of recommendations
  → Response returned to MFE
```

---

## 6. Kafka Configuration

**Topic:** `order.created`  
**Partitions:** 3 (PoC)  
**Replication factor:** 1 (PoC, no HA required)  
**Consumer group:** `ai-service`

Producer configuration (Order Service):
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
```

Consumer configuration (AI Service):
```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: ai-service
      auto-offset-reset: earliest
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.ecommerce.events"
```

---

## 7. Docker Compose

Docker Compose is split into two files to allow infrastructure and application services to be started independently.

**`docker-compose.infra.yml`** — infrastructure only (Postgres, Elasticsearch, Kafka):

```yaml
version: '3.9'
services:

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ecommerce
      POSTGRES_PASSWORD: ecommerce
      POSTGRES_DB: ecommerce
    ports:
      - "5432:5432"

  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kafka:
    image: apache/kafka:3.7.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
```

**`docker-compose.services.yml`** — application services (Gateway + backends):

```yaml
version: '3.9'
services:

  gateway:
    build: ./apps/ecommerce-gateway
    ports:
      - "8080:8080"
    depends_on: [product-service, order-service, ai-service]
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

**Startup sequence:**

```bash
# 1. Start infrastructure first
docker compose -f docker-compose.infra.yml up -d

# 2. Start application services (once Dockerfiles exist for each service)
docker compose -f docker-compose.services.yml up -d
```

> For local development (running services directly on the host via `./gradlew bootRun`), only step 1 is needed — the `application.yml` in each service already targets `localhost` URIs.

---

## 8. Repository Structure

```
ecommerce-eda-mfe/
├── docker-compose.infra.yml          ← Postgres, Elasticsearch, Kafka
├── docker-compose.services.yml       ← Gateway + backend application services
├── apps/
│   ├── ecommerce-gateway/            ← Spring Cloud Gateway (port 8080)
│   │   ├── src/main/java/com/ecommerce/gateway/
│   │   │   ├── GatewayApplication.java
│   │   │   └── filter/
│   │   │       └── CorrelationIdFilter.java
│   │   ├── src/main/resources/
│   │   │   ├── application.yml
│   │   │   └── application-local.yml
│   │   └── build.gradle
│   ├── product-service/              ← GraphQL + Elasticsearch (port 8081)
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/com/ecommerce/product/
│   │   │       │   ├── controller/   ← GraphQL resolvers
│   │   │       │   ├── domain/       ← JPA entities
│   │   │       │   ├── repository/   ← JPA + ES repositories
│   │   │       │   ├── search/       ← ES documents + search service
│   │   │       │   └── service/
│   │   │       └── resources/
│   │   │           ├── graphql/schema.graphqls
│   │   │           └── application.yml
│   │   └── build.gradle
│   ├── order-service/                ← REST + Kafka producer (port 8082, planned)
│   │   ├── src/main/java/com/ecommerce/order/
│   │   │   ├── controller/
│   │   │   ├── domain/
│   │   │   ├── event/                ← Kafka event classes
│   │   │   ├── repository/
│   │   │   └── service/
│   │   └── build.gradle
│   ├── ai-service/                   ← Spring AI + Kafka consumer (port 8083, planned)
│   │   ├── src/main/java/com/ecommerce/ai/
│   │   │   ├── controller/
│   │   │   ├── consumer/             ← Kafka listener
│   │   │   ├── prompt/               ← prompt templates
│   │   │   ├── repository/
│   │   │   └── service/
│   │   └── build.gradle
│   ├── mfe-shell/                    ← Module Federation host (port 3000, planned)
│   │   ├── src/
│   │   ├── webpack.config.js
│   │   └── package.json
│   ├── mfe-catalog/                  ← Catalog remote (port 3001, planned)
│   │   ├── src/
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.ts
│   │   └── package.json
│   └── mfe-cart/                     ← Cart remote (port 3002, planned)
│       ├── src/
│       ├── webpack.config.js
│       └── package.json
└── .specs/                           ← Per-phase specs and task checklists
    ├── 001-product-service/
    ├── 002-api-gateway/
    └── 003-catalog-mfe/
```

---

## 9. Implementation Order

### Phase 1 — Infrastructure (Day 1)
1. Set up the mono-repo (or multi-repo) structure and Docker Compose with Postgres, Elasticsearch, and Kafka.
2. Verify all three infra services start cleanly and are accessible.

### Phase 2 — Product Service (Days 2–4)
3. Bootstrap Spring Boot project with `spring-boot-starter-graphql` and `spring-data-elasticsearch`.
4. Create `Product` JPA entity and `ProductRepository`.
5. Create `ProductDocument` and `ProductSearchRepository`.
6. Implement `ProductIndexingService` that writes to ES on every save.
7. Implement GraphQL resolvers (`products` query with filter, `product` by ID).
8. Seed the database with 80–100 sample products.
9. Verify full-text search works via GraphQL (`http://localhost:8081/graphql`).

### Phase 3 — API Gateway (Day 5)
10. Bootstrap Spring Cloud Gateway.
11. Configure routes for Product, Order, and AI services.
12. Add a CORS filter for MFE origins (`localhost:3000`, `3001`, `3002`).

### Phase 4 — Catalog MFE (Days 6–7)
13. Bootstrap Vite app as a Module Federation remote (`@originjs/vite-plugin-federation`) with deferred bootstrap (`main.tsx` -> `import('./bootstrap')`).
14. Implement GraphQL query hooks using `graphql-request` + TanStack Query (`products`, `product`) against Gateway `/graphql`.
15. Implement catalog search/list/filter UI with Tailwind (mandatory), including debounced search and responsive product grid.
16. Implement product detail page and dispatch `cart:add-item` CustomEvent contract for Shell/Cart interoperability.

### Phase 5 — Shell + Cart MFE (Days 8–9)
17. Bootstrap Shell as Module Federation host with lazy routes.
18. Bootstrap Cart MFE as a Module Federation remote.
19. Implement cart state (add, update, remove items).
20. Wire "Add to cart" in Catalog MFE via cross-MFE event/store.
21. Verify lazy loading: both MFEs load on demand, not on initial page load.

### Phase 6 — Order Service (Days 10–11)
22. Bootstrap Spring Boot project with `spring-kafka`.
23. Implement `POST /api/orders` endpoint with full persistence.
24. Implement `OrderEventPublisher` publishing to `order.created`.
25. Verify event appears in Kafka (use `kafka-console-consumer` or Offset Explorer).
26. Wire Cart MFE "Place Order" button to call the Order Service.

### Phase 7 — AI Service (Days 12–14)
27. Bootstrap Spring Boot project with `spring-ai`.
28. Implement Kafka consumer for `order.created` and persist user history.
29. Implement `RecommendationService` with prompt template.
30. Implement `GET /api/ai/recommendations/{userId}` endpoint.
31. Display recommendations in Catalog MFE sidebar or home page.

### Phase 8 — Integration and Polish (Days 15–16)
32. End-to-end test: search → add to cart → place order → receive recommendation.
33. Add `/actuator/health` checks and verify all services report UP.
34. Write per-service `README.md` files.
35. Tag `v0.1.0-poc` in the repository.

---

## 10. Key Design Decisions

**Why GraphQL only on Product Service?**
Product querying is the most variable access pattern (many filter/sort/pagination combinations). Order and AI endpoints have fixed shapes, so REST is simpler and sufficient.

**Why not share a database between services?**
Each service owns its data to ensure loose coupling. In the PoC all services point to the same Postgres instance but use separate schemas (`product`, `order`, `ai_history`) — this makes it trivial to split into separate databases later.

**Why Elasticsearch instead of Postgres full-text?**
Postgres `tsvector` would work for the PoC, but the goal is explicitly to practice Elasticsearch integration. ES also makes it easier to add faceted filtering, relevance tuning, and autocomplete in future phases.

**Why KRaft instead of Zookeeper?**
Kafka 3.x supports KRaft (Kafka Raft) natively. Removing Zookeeper simplifies the Docker Compose setup and aligns with the direction of the Kafka project.

**Why a single Kafka topic for PoC?**
One topic keeps the PoC simple. The naming convention `order.created` already establishes the pattern: `{entity}.{event}`. Adding `product.updated`, `payment.completed` etc. later follows naturally.

---

## 11. Future Architecture Considerations

| Concern | Recommendation |
|---------|----------------|
| Authentication | Keycloak (OIDC) with Spring Security resource server on each service |
| Service discovery | Spring Cloud Netflix Eureka or Kubernetes Services |
| Distributed transactions | Choreography-based Saga (Kafka events per step) |
| Circuit breaking | Resilience4j on the Gateway |
| Secret management | HashiCorp Vault or Kubernetes Secrets |
| CI/CD | GitHub Actions → build, test, push Docker image |
| Observability | OpenTelemetry collector + Grafana + Loki + Tempo |
| API versioning | GraphQL schema versioning via `@deprecated` directives |
| MFE versioning | Independent semantic versioning per remote, pinned in Shell config |
