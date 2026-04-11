# Tasks — Phase 1 (Infrastructure) & Phase 2 (Product Service)

**Spec:** `SPEC.md`  
**Design doc:** `docs/DESIGN_DOC.md`  
**Last updated:** 2026-04-11

Check off each task as it is completed. Tasks are ordered by implementation sequence — dependencies flow top-to-bottom within each section.

---

## Phase 1 — Infrastructure

### 1.1 Docker Compose

- [ ] Create `docker-compose.yml` at the repo root with the following services:
  - [ ] `postgres` — `postgres:16-alpine`, port `5432`, volume `postgres_data`, healthcheck via `pg_isready`
  - [ ] `elasticsearch` — `elasticsearch:8.13.0`, port `9200`, single-node, security disabled, 512 MB heap, volume `es_data`, healthcheck via `curl` cluster health
  - [ ] `kafka` — `apache/kafka:3.7.0`, port `9092`, KRaft mode (no Zookeeper), `KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`, healthcheck via `kafka-broker-api-versions.sh`
  - [ ] Declare named volumes: `postgres_data`, `es_data`

### 1.2 Acceptance checks (Phase 1)

- [ ] `docker compose up -d` starts all three services without errors
- [ ] `curl http://localhost:9200` returns Elasticsearch cluster JSON
- [ ] `psql -h localhost -U ecommerce -d ecommerce -c "\l"` lists the `ecommerce` database
- [ ] Kafka responds to `kafka-broker-api-versions.sh --bootstrap-server localhost:9092`

---

## Phase 2 — Product Service

### 2.1 Project scaffold

- [ ] Create directory `apps/product-service/`
- [ ] Create `apps/product-service/settings.gradle`
  ```groovy
  rootProject.name = 'product-service'
  ```
- [ ] Create `apps/product-service/build.gradle` with:
  - Spring Boot `3.3.0` plugin + `io.spring.dependency-management 1.1.5`
  - `sourceCompatibility = '21'`
  - Dependencies: `spring-boot-starter-graphql`, `spring-boot-starter-data-jpa`, `spring-boot-starter-data-elasticsearch`, `spring-boot-starter-web`, `spring-boot-starter-actuator`, `flyway-core`, `flyway-database-postgresql`, `postgresql` (runtime), `spring-boot-starter-test`, `spring-webflux` (test), `spring-graphql-test` (test)

### 2.2 Application entry point

- [ ] Create `ProductServiceApplication.java` at `src/main/java/com/ecommerce/product/`
  - Annotate with `@SpringBootApplication` and `@EnableJpaAuditing`
  - Standard `main` method

### 2.3 Configuration files

- [ ] Create `src/main/resources/application.yml` with:
  - `spring.application.name: product-service`
  - Datasource: `jdbc:postgresql://localhost:5432/ecommerce`, user `ecommerce`, pass `ecommerce`
  - JPA: `ddl-auto: validate`, `default_schema: product`, `open-in-view: false`
  - Flyway: `schemas: product`, `baseline-on-migrate: true`
  - Elasticsearch URI: `http://localhost:9200`
  - GraphQL GraphiQL: `enabled: false`
  - Server port: `8081`
  - Actuator endpoints exposed: `health`, `info`, `metrics`
- [ ] Create `src/main/resources/application-local.yml` with:
  - GraphQL GraphiQL: `enabled: true`
  - Logging `DEBUG` for `com.ecommerce` and `org.springframework.graphql`

### 2.4 Database migration (Flyway)

- [ ] Create `src/main/resources/db/migration/V1__create_product_table.sql` with:
  - `CREATE SCHEMA IF NOT EXISTS product`
  - Table `product.products`: columns `id` (UUID PK, `gen_random_uuid()`), `name` (VARCHAR 255, NOT NULL), `description` (TEXT), `price` (NUMERIC 10,2 NOT NULL), `category` (VARCHAR 100), `image_url` (VARCHAR 500), `created_at` (TIMESTAMP NOT NULL DEFAULT now()), `updated_at` (TIMESTAMP NOT NULL DEFAULT now())
  - Index `idx_products_category` on `product.products(category)`

### 2.5 Domain model

- [ ] Create `src/main/java/com/ecommerce/product/domain/Product.java`
  - `@Entity`, `@Table(name = "products", schema = "product")`, `@EntityListeners(AuditingEntityListener.class)`
  - Fields: `id` (UUID, `@GeneratedValue(GenerationType.UUID)`), `name`, `description`, `price` (BigDecimal, precision 10 scale 2), `category`, `imageUrl`
  - Auditing fields: `createdAt` (`@CreatedDate`, not updatable), `updatedAt` (`@LastModifiedDate`)
  - Getters and setters for all fields

### 2.6 Repositories

- [ ] Create `src/main/java/com/ecommerce/product/repository/ProductRepository.java`
  - Extends `JpaRepository<Product, UUID>`
- [ ] Create `src/main/java/com/ecommerce/product/repository/ProductSearchRepository.java`
  - Extends `ElasticsearchRepository<ProductDocument, String>`
  - Derived query: `Page<ProductDocument> findByCategoryAndPriceBetween(String category, Double minPrice, Double maxPrice, Pageable pageable)`

### 2.7 Elasticsearch document and config

- [ ] Create `src/main/java/com/ecommerce/product/search/ProductDocument.java`
  - `@Document(indexName = "products")`
  - Fields: `id` (String), `name` (Text, standard analyzer), `description` (Text, standard analyzer), `category` (Keyword), `price` (Double), `imageUrl` (Keyword)
  - Static factory method `ProductDocument.from(Product product)`
- [ ] Create `src/main/java/com/ecommerce/product/config/ElasticsearchConfig.java`
  - Extends `ElasticsearchConfiguration`
  - Injects `${spring.elasticsearch.uris}` and strips `http://` prefix in `clientConfiguration()`

### 2.8 Indexing service

- [ ] Create `src/main/java/com/ecommerce/product/search/ProductIndexingService.java`
  - `@Service`, `@RequiredArgsConstructor`
  - `index(Product product)` — saves `ProductDocument.from(product)` via `ProductSearchRepository`
  - `delete(UUID productId)` — deletes by `productId.toString()`

### 2.9 Service layer

- [ ] Create `src/main/java/com/ecommerce/product/service/ProductFilter.java`
  - Java `record` with fields: `query` (String), `category` (String), `minPrice` (Double), `maxPrice` (Double)
- [ ] Create `src/main/java/com/ecommerce/product/service/ProductService.java`
  - `@Service`, `@Transactional`, `@RequiredArgsConstructor`
  - Inject: `ProductRepository`, `ProductIndexingService`, `ElasticsearchOperations`
  - `save(Product product)` — persists to Postgres then indexes in ES, returns saved entity
  - `findById(UUID id)` — read-only, delegates to `ProductRepository`
  - `search(ProductFilter filter, Pageable pageable)` — executes `NativeQuery` against ES, hydrates results from Postgres preserving ES ranking order, returns `PageImpl<Product>`
  - Private `buildQuery(ProductFilter, Pageable)` building a `BoolQuery` with:
    - `MultiMatchQuery` on `name^2` + `description` (when `filter.query()` is set)
    - `TermQuery` filter on `category` (when set)
    - `RangeQuery` filter on `price` (when `minPrice` or `maxPrice` is set)

### 2.10 GraphQL schema and controller

- [ ] Create `src/main/resources/graphql/schema.graphqls` with:
  - `Query` type: `products(filter: ProductFilter, page: Int, size: Int): ProductPage!` and `product(id: ID!): Product`
  - `input ProductFilter`: `query`, `category`, `minPrice`, `maxPrice`
  - `type Product`: `id`, `name`, `description`, `price`, `category`, `imageUrl`
  - `type ProductPage`: `content: [Product!]!`, `totalElements: Int!`, `totalPages: Int!`, `currentPage: Int!`
- [ ] Create `src/main/java/com/ecommerce/product/controller/ProductPage.java`
  - Java `record` with fields: `content` (List<Product>), `totalElements` (long), `totalPages` (int), `currentPage` (int)
- [ ] Create `src/main/java/com/ecommerce/product/controller/ProductController.java`
  - `@Controller`, `@RequiredArgsConstructor`
  - `@QueryMapping products(...)` — defaults page to 0, size to 20; calls `productService.search()`; returns `ProductPage`
  - `@QueryMapping product(@Argument String id)` — parses UUID, delegates to `productService.findById()`, returns `null` if not found

### 2.11 Data seeder

- [ ] Create `src/main/java/com/ecommerce/product/seed/ProductDataSeeder.java`
  - `@Component`, `@Profile("local")`, `@RequiredArgsConstructor`, implements `ApplicationRunner`
  - `TARGET_COUNT = 100`
  - `run()` — checks existing count, skips if already at target (idempotent)
  - `generateProducts(int count)` — uses fixed `Random(42)` seed for reproducibility; 5 category templates (Electronics, Clothing, Books, Home & Kitchen, Sports); generates variants with `v2`, `v3` suffixes if templates exhausted; sets `imageUrl` to `https://placehold.co/400x300?text=<URL-encoded-name>`; rounds price to 2 decimal places using `HALF_UP`

### 2.12 Acceptance checks (Phase 2)

- [ ] **AC-1** `docker compose up -d` starts Postgres, ES, and Kafka
- [ ] **AC-2** `./gradlew bootRun --args='--spring.profiles.active=local'` from `apps/product-service/` starts on port 8081 without errors
- [ ] **AC-3** Flyway applies `V1__create_product_table.sql` and the `product.products` table exists on first start
- [ ] **AC-4** Running with `local` profile inserts 100 products in Postgres and indexes them in ES; subsequent restarts produce no duplicates
- [ ] **AC-5** Running without `local` profile does **not** invoke the seeder
- [ ] **AC-6** `GET http://localhost:8081/actuator/health` returns `{"status":"UP"}`
- [ ] **AC-7** `{ products { content { id name price category } totalElements } }` returns 100 products
- [ ] **AC-8** `{ products(filter: { query: "headphones" }) { content { name } } }` returns results ranked by ES relevance
- [ ] **AC-9** `{ products(filter: { category: "Electronics", maxPrice: 100 }) { content { name price } } }` returns only Electronics under $100
- [ ] **AC-10** `{ product(id: "<uuid>") { name price } }` returns the correct product
