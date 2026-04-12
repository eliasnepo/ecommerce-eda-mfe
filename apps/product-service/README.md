# Product Service

The Product Service is the catalog backbone of the e-commerce platform. It owns the canonical product data in PostgreSQL, exposes a GraphQL API for flexible client queries, and maintains a mirrored Elasticsearch index for full-text search, category filtering, and price-range filtering.

It runs on port **8081** and is accessed exclusively through the API Gateway at port **8080**. The Catalog MFE queries it via the gateway.

---

## Tech Stack

| Concern | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.3 |
| API layer | Spring for GraphQL (spring-boot-starter-graphql) |
| Persistence | Spring Data JPA + Hibernate (validate mode) |
| Database | PostgreSQL 16 (`product` schema) |
| Search | Elasticsearch 8.13 (Spring Data Elasticsearch) |
| Migrations | Flyway |
| Build | Gradle 8.7 |
| Testing | JUnit 5, AssertJ, Mockito, Spring GraphQL Test, Testcontainers |

---

## Prerequisites

- Java 21
- Docker (for infrastructure and integration tests)
- Infrastructure stack running (PostgreSQL on 5432, Elasticsearch on 9200)

Start the shared infrastructure:

```bash
docker compose -f docker-compose.infra.yml up -d
```

---

## Running the Service

### Local development (recommended)

The `local` profile enables GraphiQL and sets log levels to DEBUG. It also activates the data seeder which populates 100 products on first startup.

```bash
./gradlew bootRun --args='--spring.profiles.active=local'
```

### Default (no profile)

```bash
./gradlew bootRun
```

### Build

```bash
./gradlew build
```

### Health check

```bash
curl http://localhost:8081/actuator/health
```

### GraphiQL

Available at `http://localhost:8081/graphiql` when running with the `local` profile. Disabled in all other profiles.

---

## Configuration

### Base configuration (`application.yml`)

| Property | Default value | Description |
|---|---|---|
| `server.port` | `8081` | HTTP port |
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/ecommerce` | PostgreSQL connection |
| `spring.datasource.username` | `ecommerce` | DB username |
| `spring.datasource.password` | `ecommerce` | DB password |
| `spring.jpa.hibernate.ddl-auto` | `validate` | Hibernate never modifies schema |
| `spring.jpa.properties.hibernate.default_schema` | `product` | JPA uses the `product` schema |
| `spring.flyway.schemas` | `product` | Flyway manages the `product` schema |
| `spring.elasticsearch.uris` | `http://localhost:9200` | Elasticsearch endpoint |
| `spring.graphql.graphiql.enabled` | `false` | GraphiQL browser UI |
| `management.endpoints.web.exposure.include` | `health,info,metrics` | Actuator endpoints |

### Local profile overrides (`application-local.yml`)

| Property | Value |
|---|---|
| `spring.graphql.graphiql.enabled` | `true` |
| `logging.level.com.ecommerce` | `DEBUG` |
| `logging.level.org.springframework.graphql` | `DEBUG` |

### Test profile (`application-test.yml`)

The test profile disables GraphiQL and sets `ddl-auto: validate`. Integration tests override datasource and Elasticsearch URIs dynamically via Testcontainers `@DynamicPropertySource`.

---

## GraphQL API

The service exposes a single GraphQL endpoint at `POST /graphql`.

### Schema

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

### Query: `products`

Returns a paginated, filtered list of products. All filter fields are optional and combinable. Pagination defaults to page `0`, size `20`.

**List all products (default pagination):**

```graphql
{
  products {
    content {
      id
      name
      price
      category
      imageUrl
    }
    totalElements
    totalPages
    currentPage
  }
}
```

**Full-text search with category and price filters:**

```graphql
{
  products(
    filter: { query: "headphones", category: "Electronics", minPrice: 20, maxPrice: 100 }
    page: 0
    size: 10
  ) {
    content {
      id
      name
      price
    }
    totalElements
    totalPages
    currentPage
  }
}
```

**Filter by category only:**

```graphql
{
  products(filter: { category: "Books" }, page: 0, size: 5) {
    content { id name price }
    totalElements
  }
}
```

### Query: `product`

Returns a single product by UUID, or `null` if not found.

```graphql
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    description
    price
    category
    imageUrl
  }
}
```

Variables:

```json
{ "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6" }
```

---

## Data Model

### `Product` entity (`product.products` table)

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, `gen_random_uuid()` | Auto-generated |
| `name` | `VARCHAR(255)` | NOT NULL | |
| `description` | `TEXT` | nullable | |
| `price` | `NUMERIC(10, 2)` | NOT NULL | Stored as `BigDecimal` |
| `category` | `VARCHAR(100)` | nullable | Indexed |
| `image_url` | `VARCHAR(500)` | nullable | |
| `created_at` | `TIMESTAMP` | NOT NULL, not updatable | JPA `@CreatedDate` |
| `updated_at` | `TIMESTAMP` | NOT NULL | JPA `@LastModifiedDate` |

JPA auditing is enabled globally via `@EnableJpaAuditing` on the application class. The `@EntityListeners(AuditingEntityListener.class)` annotation on `Product` populates `createdAt` and `updatedAt` automatically.

---

## Elasticsearch Indexing Strategy

The `products` index mirrors the `Product` entity using a separate `ProductDocument` class. Queries go to Elasticsearch first; the result IDs are then used to hydrate full `Product` objects from PostgreSQL in a single batch query. This preserves ES relevance ranking while keeping PostgreSQL as the authoritative source of truth.

### `ProductDocument` field mapping

| Field | ES type | Analyzer | Notes |
|---|---|---|---|
| `id` | Keyword (id) | — | UUID as string |
| `name` | Text | standard | Boosted (^2) in multi-match queries |
| `description` | Text | standard | Included in full-text search |
| `category` | Keyword | — | Used for exact-match term filter |
| `price` | Double | — | Used for range filter |
| `imageUrl` | Keyword | — | Not searchable; stored for display |

### Query construction

`ProductService.search()` builds an Elasticsearch `BoolQuery` using the Elasticsearch Java client's builder API:

- `query` field: `multi_match` across `name^2` and `description`
- `category` field: `term` filter (exact match, keyword)
- `minPrice` / `maxPrice`: `range` filter on the `price` field

All filter clauses are optional and composed independently.

### Indexing flow

1. `ProductService.save()` persists to PostgreSQL via `ProductRepository`.
2. Immediately after, `ProductIndexingService.index()` serializes the saved entity to a `ProductDocument` and writes it to Elasticsearch via `ProductSearchRepository` (extends `ElasticsearchRepository`).

Deletion is supported via `ProductIndexingService.delete(UUID)`.

---

## Flyway Migration Summary

Flyway manages the `product` schema. Migrations live in `src/main/resources/db/migration/`.

| Version | File | Description |
|---|---|---|
| V1 | `V1__create_product_table.sql` | Creates the `product` schema and `product.products` table with a `category` index |

`baseline-on-migrate: true` is set so that Flyway can be applied to a database that already has the `product` schema populated.

---

## Testing

### Run all tests

```bash
./gradlew test
```

### Test reports

HTML reports are generated at `build/reports/tests/test/index.html`.

### Test structure

| Package | Class | Type | Description |
|---|---|---|---|
| `service` | `ProductServiceTest` | Unit | Mocks `ProductRepository`, `ProductIndexingService`, and `ElasticsearchOperations`. Verifies save+index flow, findById delegation, search result ordering, and filter query building. |
| `controller` | `ProductControllerTest` | Slice (`@GraphQlTest`) | Uses Spring GraphQL test utilities and a mocked `ProductService`. Verifies GraphQL query execution, filter argument binding, default pagination, and null result handling. |
| `integration` | `ProductIntegrationTest` | Integration (`@SpringBootTest`) | Runs against real PostgreSQL 16 and Elasticsearch 8.13 containers via Testcontainers. Covers full save-to-search flow, text search, category filter, price range, combined filters, and pagination. |

### Integration test dependencies

The integration tests require Docker to be running. Testcontainers pulls the following images automatically:

- `postgres:16-alpine`
- `docker.elastic.co/elasticsearch/elasticsearch:8.13.0`

---

## Key Design Decisions

**GraphQL over REST.** The product catalog has variable access patterns: the Catalog MFE needs paginated lists with filters, while the Cart MFE needs single-product lookups. GraphQL allows each consumer to request exactly the fields it needs without multiple REST endpoints.

**Elasticsearch for search, PostgreSQL for canonical data.** Elasticsearch handles full-text ranking, category filtering, and price-range queries efficiently. PostgreSQL remains the system of record. After each ES query, product IDs are re-fetched from Postgres in a single `findAllById` batch to guarantee data consistency and preserve ES relevance ordering.

**Post-save synchronous indexing.** Indexing is triggered immediately after `productRepository.save()` within the same request. This keeps the ES index close to real-time for a PoC without requiring a separate event pipeline. The tradeoff is that a failed ES write does not roll back the Postgres write.

**Hibernate `validate` mode.** Hibernate never modifies the schema. Flyway owns all DDL. This prevents accidental schema drift in shared environments.

**UUID primary keys.** All products use `gen_random_uuid()` in PostgreSQL and `GenerationType.UUID` in JPA, ensuring globally unique, non-guessable identifiers.

**Shared PostgreSQL, isolated schema.** The service writes exclusively to the `product` schema within the shared `ecommerce` database. This simplifies the PoC setup while keeping schema boundaries clear for a potential future split into a dedicated database.

**Data seeder scoped to `local` profile.** `ProductDataSeeder` is a `@Profile("local")` `ApplicationRunner` that populates 100 products across five categories on first startup. It is never active in test or production profiles.
