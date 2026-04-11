# Implementation Spec — Phase 1 (Infrastructure) & Phase 2 (Product Service)

**Status:** Ready for implementation  
**Design doc:** `docs/DESIGN_DOC.md`  
**Last updated:** 2026-04-11

---

## Phase 1 — Infrastructure

### Goal
Stand up the local infrastructure stack (PostgreSQL, Elasticsearch, Kafka) via Docker Compose so all backend services can run against real dependencies from day one.

### Deliverables

#### `docker-compose.yml` (repo root)

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
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ecommerce"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    image: elasticsearch:8.13.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ports:
      - "9200:9200"
    volumes:
      - es_data:/usr/share/elasticsearch/data
    healthcheck:
      test: ["CMD-SHELL", "curl -s http://localhost:9200/_cluster/health | grep -q '\"status\":\"green\"\\|\"status\":\"yellow\"'"]
      interval: 15s
      timeout: 10s
      retries: 10

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
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    healthcheck:
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1"]
      interval: 15s
      timeout: 10s
      retries: 10

volumes:
  postgres_data:
  es_data:
```

### Acceptance criteria — Phase 1
- `docker compose up -d` starts all three services without errors.
- `curl http://localhost:9200` returns a JSON response with Elasticsearch cluster info.
- `psql -h localhost -U ecommerce -d ecommerce -c "\l"` lists the `ecommerce` database.
- Kafka responds to `kafka-broker-api-versions.sh --bootstrap-server localhost:9092`.

---

## Phase 2 — Product Service

### Goal
Implement a Spring Boot service that manages canonical product data in PostgreSQL, indexes it in Elasticsearch, and exposes a GraphQL API for querying. Seed 80–100 products when running with the `local` Spring profile.

### Location
`apps/product-service/`

---

### Project structure

```
apps/product-service/
├── build.gradle
├── settings.gradle
├── src/
│   └── main/
│       ├── java/com/ecommerce/product/
│       │   ├── ProductServiceApplication.java
│       │   ├── config/
│       │   │   └── ElasticsearchConfig.java
│       │   ├── controller/
│       │   │   └── ProductController.java          ← @QueryMapping GraphQL resolvers
│       │   ├── domain/
│       │   │   └── Product.java                    ← JPA entity
│       │   ├── repository/
│       │   │   ├── ProductRepository.java           ← JpaRepository
│       │   │   └── ProductSearchRepository.java     ← ElasticsearchRepository
│       │   ├── search/
│       │   │   ├── ProductDocument.java             ← @Document ES DTO
│       │   │   └── ProductIndexingService.java      ← Postgres → ES sync
│       │   ├── service/
│       │   │   └── ProductService.java
│       │   └── seed/
│       │       └── ProductDataSeeder.java           ← @Profile("local") only
│       └── resources/
│           ├── graphql/
│           │   └── schema.graphqls
│           ├── db/migration/
│           │   └── V1__create_product_table.sql     ← Flyway migration
│           ├── application.yml
│           └── application-local.yml
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

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-graphql'
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa'
    implementation 'org.springframework.boot:spring-boot-starter-data-elasticsearch'
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.flywaydb:flyway-core'
    implementation 'org.flywaydb:flyway-database-postgresql'

    runtimeOnly 'org.postgresql:postgresql'

    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework:spring-webflux'
    testImplementation 'org.springframework.graphql:spring-graphql-test'
}
```

> **Note:** Spring Boot 3.3 is used because Spring Boot 4.x is not yet GA. Swap to `4.x` once released.

---

### Database migrations (Flyway)

**`src/main/resources/db/migration/V1__create_product_table.sql`**

```sql
CREATE SCHEMA IF NOT EXISTS product;

CREATE TABLE product.products (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       NUMERIC(10, 2) NOT NULL,
    category    VARCHAR(100),
    image_url   VARCHAR(500),
    created_at  TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON product.products (category);
```

Flyway runs automatically on application startup. No manual migration step needed.

---

### Configuration

**`src/main/resources/application.yml`**

```yaml
spring:
  application:
    name: product-service

  datasource:
    url: jdbc:postgresql://localhost:5432/ecommerce
    username: ecommerce
    password: ecommerce

  jpa:
    hibernate:
      ddl-auto: validate       # Flyway owns the schema; Hibernate must not alter it
    properties:
      hibernate:
        default_schema: product
    open-in-view: false

  flyway:
    schemas: product
    baseline-on-migrate: true

  elasticsearch:
    uris: http://localhost:9200

  graphql:
    graphiql:
      enabled: false           # disabled in production/non-local

server:
  port: 8081

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

**`src/main/resources/application-local.yml`**

```yaml
spring:
  graphql:
    graphiql:
      enabled: true            # enable GraphiQL explorer locally

logging:
  level:
    com.ecommerce: DEBUG
    org.springframework.graphql: DEBUG
```

---

### GraphQL schema

**`src/main/resources/graphql/schema.graphqls`**

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

---

### Domain model

**`domain/Product.java`** — JPA entity

```java
@Entity
@Table(name = "products", schema = "product")
@EntityListeners(AuditingEntityListener.class)
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    private String category;
    private String imageUrl;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // getters / setters
}
```

Add `@EnableJpaAuditing` to `ProductServiceApplication`.

---

**`search/ProductDocument.java`** — Elasticsearch document

```java
@Document(indexName = "products")
public class ProductDocument {

    @Id
    private String id;          // String, not UUID — ES convention

    @Field(type = FieldType.Text, analyzer = "standard")
    private String name;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String description;

    @Field(type = FieldType.Keyword)
    private String category;

    @Field(type = FieldType.Double)
    private Double price;

    @Field(type = FieldType.Keyword)
    private String imageUrl;

    // getters / setters

    public static ProductDocument from(Product product) {
        ProductDocument doc = new ProductDocument();
        doc.setId(product.getId().toString());
        doc.setName(product.getName());
        doc.setDescription(product.getDescription());
        doc.setCategory(product.getCategory());
        doc.setPrice(product.getPrice().doubleValue());
        doc.setImageUrl(product.getImageUrl());
        return doc;
    }
}
```

---

### Repositories

**`repository/ProductRepository.java`**

```java
public interface ProductRepository extends JpaRepository<Product, UUID> {}
```

**`repository/ProductSearchRepository.java`**

```java
public interface ProductSearchRepository
        extends ElasticsearchRepository<ProductDocument, String> {

    Page<ProductDocument> findByCategoryAndPriceBetween(
            String category, Double minPrice, Double maxPrice, Pageable pageable);
}
```

---

### Services

**`search/ProductIndexingService.java`**

Responsible for keeping Elasticsearch in sync whenever a product is saved.

```java
@Service
@RequiredArgsConstructor
public class ProductIndexingService {

    private final ProductSearchRepository searchRepository;

    public void index(Product product) {
        searchRepository.save(ProductDocument.from(product));
    }

    public void delete(UUID productId) {
        searchRepository.deleteById(productId.toString());
    }
}
```

**`service/ProductService.java`**

```java
@Service
@Transactional
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductIndexingService indexingService;
    private final ElasticsearchOperations elasticsearchOperations;

    public Product save(Product product) {
        Product saved = productRepository.save(product);
        indexingService.index(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<Product> findById(UUID id) {
        return productRepository.findById(id);
    }

    /**
     * Executes a full-text + filter search in Elasticsearch and returns matching
     * product IDs, then hydrates from Postgres to keep canonical data authoritative.
     */
    @Transactional(readOnly = true)
    public Page<Product> search(ProductFilter filter, Pageable pageable) {
        // Build ES query
        NativeQuery query = buildQuery(filter, pageable);
        SearchHits<ProductDocument> hits =
                elasticsearchOperations.search(query, ProductDocument.class);

        List<UUID> ids = hits.stream()
                .map(h -> UUID.fromString(h.getContent().getId()))
                .toList();

        // Hydrate from Postgres, preserving ES ranking order
        Map<UUID, Product> byId = productRepository.findAllById(ids)
                .stream()
                .collect(Collectors.toMap(Product::getId, p -> p));

        List<Product> ordered = ids.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .toList();

        return new PageImpl<>(ordered, pageable, hits.getTotalHits());
    }

    private NativeQuery buildQuery(ProductFilter filter, Pageable pageable) {
        BoolQuery.Builder bool = new BoolQuery.Builder();

        if (filter != null && filter.query() != null && !filter.query().isBlank()) {
            bool.must(MultiMatchQuery.of(m -> m
                    .query(filter.query())
                    .fields("name^2", "description")
            )._toQuery());
        }

        if (filter != null && filter.category() != null) {
            bool.filter(TermQuery.of(t -> t
                    .field("category")
                    .value(filter.category())
            )._toQuery());
        }

        if (filter != null && (filter.minPrice() != null || filter.maxPrice() != null)) {
            RangeQuery.Builder range = new RangeQuery.Builder().field("price");
            if (filter.minPrice() != null) range.gte(JsonData.of(filter.minPrice()));
            if (filter.maxPrice() != null) range.lte(JsonData.of(filter.maxPrice()));
            bool.filter(range.build()._toQuery());
        }

        return NativeQuery.builder()
                .withQuery(bool.build()._toQuery())
                .withPageable(pageable)
                .build();
    }
}
```

**`service/ProductFilter.java`** — record used as the GraphQL input type mapping

```java
public record ProductFilter(
    String query,
    String category,
    Double minPrice,
    Double maxPrice
) {}
```

---

### GraphQL controller

**`controller/ProductController.java`**

```java
@Controller
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @QueryMapping
    public ProductPage products(
            @Argument ProductFilter filter,
            @Argument Integer page,
            @Argument Integer size) {

        int pageNum  = page  != null ? page  : 0;
        int pageSize = size  != null ? size  : 20;
        Pageable pageable = PageRequest.of(pageNum, pageSize);

        Page<Product> result = productService.search(filter, pageable);

        return new ProductPage(
                result.getContent(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.getNumber()
        );
    }

    @QueryMapping
    public Product product(@Argument String id) {
        return productService.findById(UUID.fromString(id)).orElse(null);
    }
}
```

**`controller/ProductPage.java`** — response record

```java
public record ProductPage(
    List<Product> content,
    long totalElements,
    int totalPages,
    int currentPage
) {}
```

---

### Data seeder (local profile only)

**`seed/ProductDataSeeder.java`**

```java
@Component
@Profile("local")                          // runs ONLY with -Dspring.profiles.active=local
@RequiredArgsConstructor
public class ProductDataSeeder implements ApplicationRunner {

    private final ProductService productService;
    private final ProductRepository productRepository;

    private static final int TARGET_COUNT = 100;

    @Override
    public void run(ApplicationArguments args) {
        long existing = productRepository.count();
        if (existing >= TARGET_COUNT) {
            return;                        // already seeded — idempotent
        }

        List<Product> products = generateProducts(TARGET_COUNT - (int) existing);
        products.forEach(productService::save);
    }

    private List<Product> generateProducts(int count) {
        record Template(String category, String[] names, String descTemplate) {}

        List<Template> templates = List.of(
            new Template("Electronics",
                new String[]{"Wireless Headphones", "Bluetooth Speaker", "Smart Watch",
                             "USB-C Hub", "Mechanical Keyboard", "Gaming Mouse",
                             "4K Monitor", "Webcam 1080p", "LED Desk Lamp"},
                "High-quality %s for everyday use."),
            new Template("Clothing",
                new String[]{"Classic T-Shirt", "Slim Fit Jeans", "Running Shorts",
                             "Hooded Sweatshirt", "Wool Beanie", "Leather Belt",
                             "Cotton Socks", "Rain Jacket", "Yoga Pants"},
                "Comfortable and stylish %s for any occasion."),
            new Template("Books",
                new String[]{"Clean Code", "Designing Data-Intensive Applications",
                             "The Pragmatic Programmer", "Domain-Driven Design",
                             "Refactoring", "You Don't Know JS", "System Design Interview"},
                "A must-read: %s for software engineers."),
            new Template("Home & Kitchen",
                new String[]{"French Press Coffee Maker", "Cast Iron Skillet",
                             "Bamboo Cutting Board", "Stainless Steel Kettle",
                             "Digital Kitchen Scale", "Air Fryer", "Blender"},
                "Premium %s for the modern kitchen."),
            new Template("Sports",
                new String[]{"Yoga Mat", "Resistance Bands Set", "Jump Rope",
                             "Foam Roller", "Water Bottle 1L", "Running Belt",
                             "Gym Gloves"},
                "Level up your workout with this %s.")
        );

        Random random = new Random(42);    // fixed seed → reproducible data
        List<Product> products = new ArrayList<>();
        int produced = 0;

        outer:
        for (int round = 0; ; round++) {
            for (Template tpl : templates) {
                for (String name : tpl.names()) {
                    if (produced >= count) break outer;
                    Product p = new Product();
                    String variant = round > 0 ? name + " v" + (round + 1) : name;
                    p.setName(variant);
                    p.setDescription(String.format(tpl.descTemplate(), variant));
                    p.setCategory(tpl.category());
                    p.setPrice(BigDecimal.valueOf(5 + random.nextDouble() * 495)
                                        .setScale(2, RoundingMode.HALF_UP));
                    p.setImageUrl("https://placehold.co/400x300?text=" +
                                  URLEncoder.encode(variant, StandardCharsets.UTF_8));
                    products.add(p);
                    produced++;
                }
            }
        }

        return products;
    }
}
```

To activate the seeder, start the service with:
```
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun
```

---

### Elasticsearch configuration

**`config/ElasticsearchConfig.java`**

```java
@Configuration
public class ElasticsearchConfig extends ElasticsearchConfiguration {

    @Value("${spring.elasticsearch.uris}")
    private String esUri;

    @Override
    public ClientConfiguration clientConfiguration() {
        return ClientConfiguration.builder()
                .connectedTo(esUri.replace("http://", ""))
                .build();
    }
}
```

---

## Acceptance criteria — Phase 2

| # | Criterion |
|---|-----------|
| 1 | `docker compose up -d` starts Postgres, ES, and Kafka. |
| 2 | `./gradlew bootRun --args='--spring.profiles.active=local'` starts the service on port 8081 without errors. |
| 3 | Flyway applies `V1__create_product_table.sql` and creates the `product.products` table on first start. |
| 4 | Running with `local` profile inserts 100 products into Postgres and indexes them in Elasticsearch. Subsequent restarts are idempotent (no duplicate inserts). |
| 5 | Running without the `local` profile does **not** invoke the seeder. |
| 6 | `GET http://localhost:8081/actuator/health` returns `{"status":"UP"}`. |
| 7 | GraphQL query `{ products { content { id name price category } totalElements } }` returns 100 products. |
| 8 | GraphQL query `{ products(filter: { query: "headphones" }) { content { name } } }` returns results ranked by Elasticsearch relevance. |
| 9 | GraphQL query `{ products(filter: { category: "Electronics", maxPrice: 100 }) { content { name price } } }` returns only Electronics under $100. |
| 10 | GraphQL query `{ product(id: "<uuid>") { name price } }` returns the correct product. |

---

## Out of scope for this spec

- Authentication / authorization
- API Gateway routing (Phase 3)
- Order Service, AI Service (later phases)
- Frontend MFEs (later phases)
- CI/CD pipeline
