package com.ecommerce.product.integration;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.search.ProductDocument;
import com.ecommerce.product.service.ProductFilter;
import com.ecommerce.product.service.ProductSortBy;
import com.ecommerce.product.service.ProductService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.elasticsearch.ElasticsearchContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class ProductIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("ecommerce")
            .withUsername("ecommerce")
            .withPassword("ecommerce");

    @Container
    static ElasticsearchContainer elasticsearch = new ElasticsearchContainer(
            DockerImageName.parse("docker.elastic.co/elasticsearch/elasticsearch:8.13.0"))
            .withEnv("xpack.security.enabled", "false")
            .withEnv("discovery.type", "single-node");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.elasticsearch.uris", () -> "http://" + elasticsearch.getHttpHostAddress());
    }

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ElasticsearchOperations elasticsearchOperations;

    @BeforeEach
    void cleanUp() {
        productRepository.deleteAll();
        // Delete ES index if it exists and let Spring Data recreate it
        try {
            elasticsearchOperations.indexOps(ProductDocument.class).delete();
            elasticsearchOperations.indexOps(ProductDocument.class).createWithMapping();
        } catch (Exception ignored) {
            // index may not exist on first run
        }
        refreshIndex();
    }

    private void refreshIndex() {
        try {
            elasticsearchOperations.indexOps(ProductDocument.class).refresh();
        } catch (Exception ignored) {}
    }

    @Test
    void save_persistsProductInPostgresAndIndexesInES() {
        Product product = product("Wireless Headphones", "Electronics", new BigDecimal("49.99"));

        Product saved = productService.save(product);
        refreshIndex();

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();

        Optional<Product> found = productRepository.findById(saved.getId());
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("Wireless Headphones");
    }

    @Test
    void findById_returnsProductFromPostgres() {
        Product saved = productService.save(product("Gaming Mouse", "Electronics", new BigDecimal("79.99")));

        Optional<Product> result = productService.findById(saved.getId());

        assertThat(result).isPresent();
        assertThat(result.get().getName()).isEqualTo("Gaming Mouse");
        assertThat(result.get().getPrice()).isEqualByComparingTo(new BigDecimal("79.99"));
    }

    @Test
    void findById_returnsEmptyForUnknownId() {
        Optional<Product> result = productService.findById(UUID.randomUUID());
        assertThat(result).isEmpty();
    }

    @Test
    void search_returnsAllProductsWithMatchAllQuery() {
        productService.save(product("Wireless Headphones", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Bluetooth Speaker", "Electronics", new BigDecimal("29.99")));
        productService.save(product("Yoga Mat", "Sports", new BigDecimal("19.99")));
        refreshIndex();

        Page<Product> result = productService.search(null, PageRequest.of(0, 20));

        assertThat(result.getTotalElements()).isEqualTo(3);
        assertThat(result.getContent()).hasSize(3);
    }

    @Test
    void search_byTextQuery_returnsRelevantResults() {
        productService.save(product("Wireless Headphones", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Bluetooth Speaker", "Electronics", new BigDecimal("29.99")));
        productService.save(product("Yoga Mat", "Sports", new BigDecimal("19.99")));
        refreshIndex();

        Page<Product> result = productService.search(
                new ProductFilter("headphones", null, null, null, null), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Wireless Headphones");
    }

    @Test
    void search_byCategoryFilter_returnsMatchingProducts() {
        productService.save(product("Wireless Headphones", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Bluetooth Speaker", "Electronics", new BigDecimal("29.99")));
        productService.save(product("Yoga Mat", "Sports", new BigDecimal("19.99")));
        refreshIndex();

        Page<Product> result = productService.search(
                new ProductFilter(null, "Electronics", null, null, null), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent()).allMatch(p -> "Electronics".equals(p.getCategory()));
    }

    @Test
    void search_byPriceRange_returnsProductsWithinRange() {
        productService.save(product("Cheap Item", "Electronics", new BigDecimal("9.99")));
        productService.save(product("Mid Item", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Expensive Item", "Electronics", new BigDecimal("199.99")));
        refreshIndex();

        Page<Product> result = productService.search(
                new ProductFilter(null, null, 10.0, 100.0, null), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Mid Item");
    }

    @Test
    void search_byCategoryAndMaxPrice_returnsFilteredResults() {
        productService.save(product("Budget Headphones", "Electronics", new BigDecimal("29.99")));
        productService.save(product("Premium Headphones", "Electronics", new BigDecimal("299.99")));
        productService.save(product("Yoga Mat", "Sports", new BigDecimal("19.99")));
        refreshIndex();

        Page<Product> result = productService.search(
                new ProductFilter(null, "Electronics", null, 100.0, null), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Budget Headphones");
    }

    @Test
    void search_supportsPagination() {
        for (int i = 1; i <= 5; i++) {
            productService.save(product("Product " + i, "Electronics", new BigDecimal("10.00")));
        }
        refreshIndex();

        Page<Product> page1 = productService.search(null, PageRequest.of(0, 2));
        Page<Product> page2 = productService.search(null, PageRequest.of(1, 2));

        assertThat(page1.getContent()).hasSize(2);
        assertThat(page2.getContent()).hasSize(2);
        assertThat(page1.getTotalElements()).isEqualTo(5);
        assertThat(page1.getTotalPages()).isEqualTo(3);
    }

    @Test
    void search_withFuzzyTerm_matchesWirelessProducts() {
        productService.save(product("Wireless Headphones", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Bluetooth Speaker", "Electronics", new BigDecimal("29.99")));
        refreshIndex();

        Page<Product> result = productService.search(
                new ProductFilter("wirels", null, null, null, ProductSortBy.RELEVANCE),
                PageRequest.of(0, 20));

        assertThat(result.getContent()).isNotEmpty();
        assertThat(result.getContent())
                .extracting(Product::getName)
                .anyMatch(name -> name.toLowerCase().contains("wireless"));
    }

    @Test
    void search_withPriceSort_returnsExpectedOrder() {
        productService.save(product("Budget Mouse", "Electronics", new BigDecimal("9.99")));
        productService.save(product("Mid Keyboard", "Electronics", new BigDecimal("49.99")));
        productService.save(product("Premium Monitor", "Electronics", new BigDecimal("199.99")));
        refreshIndex();

        Page<Product> ascending = productService.search(
                new ProductFilter(null, null, null, null, ProductSortBy.PRICE_ASC),
                PageRequest.of(0, 20));
        Page<Product> descending = productService.search(
                new ProductFilter(null, null, null, null, ProductSortBy.PRICE_DESC),
                PageRequest.of(0, 20));

        assertThat(ascending.getContent())
                .extracting(Product::getPrice)
                .containsExactly(
                        new BigDecimal("9.99"),
                        new BigDecimal("49.99"),
                        new BigDecimal("199.99"));

        assertThat(descending.getContent())
                .extracting(Product::getPrice)
                .containsExactly(
                        new BigDecimal("199.99"),
                        new BigDecimal("49.99"),
                        new BigDecimal("9.99"));
    }

    private Product product(String name, String category, BigDecimal price) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setPrice(price);
        return p;
    }
}
