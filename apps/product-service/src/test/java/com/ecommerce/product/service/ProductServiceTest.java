package com.ecommerce.product.service;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.search.ProductDocument;
import com.ecommerce.product.search.ProductIndexingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private ProductIndexingService indexingService;

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    private ProductService productService;

    @BeforeEach
    void setUp() {
        productService = new ProductService(productRepository, indexingService, elasticsearchOperations);
    }

    @Test
    void save_persistsProductAndIndexesInES() {
        Product input = product("Wireless Headphones", "Electronics", new BigDecimal("49.99"));
        Product saved = product("Wireless Headphones", "Electronics", new BigDecimal("49.99"));
        saved.setId(UUID.randomUUID());

        when(productRepository.save(input)).thenReturn(saved);

        Product result = productService.save(input);

        assertThat(result).isEqualTo(saved);
        verify(productRepository).save(input);
        verify(indexingService).index(saved);
    }

    @Test
    void findById_delegatesToRepository() {
        UUID id = UUID.randomUUID();
        Product product = product("Test", "Electronics", new BigDecimal("10.00"));
        product.setId(id);

        when(productRepository.findById(id)).thenReturn(Optional.of(product));

        Optional<Product> result = productService.findById(id);

        assertThat(result).isPresent().contains(product);
        verify(productRepository).findById(id);
    }

    @Test
    void findById_returnsEmptyWhenNotFound() {
        UUID id = UUID.randomUUID();
        when(productRepository.findById(id)).thenReturn(Optional.empty());

        Optional<Product> result = productService.findById(id);

        assertThat(result).isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void search_withNoFilter_executesMatchAllQuery() {
        UUID id = UUID.randomUUID();
        Product product = product("Headphones", "Electronics", new BigDecimal("99.99"));
        product.setId(id);

        ProductDocument doc = new ProductDocument();
        doc.setId(id.toString());
        doc.setName("Headphones");

        SearchHit<ProductDocument> hit = mock(SearchHit.class);
        when(hit.getContent()).thenReturn(doc);

        SearchHits<ProductDocument> hits = mock(SearchHits.class);
        when(hits.stream()).thenReturn(Stream.of(hit));
        when(hits.getTotalHits()).thenReturn(1L);

        doReturn(hits).when(elasticsearchOperations).search(any(NativeQuery.class), eq(ProductDocument.class));
        when(productRepository.findAllById(List.of(id))).thenReturn(List.of(product));

        var result = productService.search(null, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Headphones");
        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void search_withQueryFilter_executesMultiMatchQuery() {
        ProductFilter filter = new ProductFilter("headphones", null, null, null);
        UUID id = UUID.randomUUID();
        Product product = product("Wireless Headphones", "Electronics", new BigDecimal("49.99"));
        product.setId(id);

        ProductDocument doc = new ProductDocument();
        doc.setId(id.toString());
        doc.setName("Wireless Headphones");

        SearchHit<ProductDocument> hit = mock(SearchHit.class);
        when(hit.getContent()).thenReturn(doc);

        SearchHits<ProductDocument> hits = mock(SearchHits.class);
        when(hits.stream()).thenReturn(Stream.of(hit));
        when(hits.getTotalHits()).thenReturn(1L);

        doReturn(hits).when(elasticsearchOperations).search(any(NativeQuery.class), eq(ProductDocument.class));
        when(productRepository.findAllById(List.of(id))).thenReturn(List.of(product));

        var result = productService.search(filter, PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Wireless Headphones");
    }

    @Test
    @SuppressWarnings("unchecked")
    void search_preservesESRankingOrder() {
        UUID id1 = UUID.randomUUID();
        UUID id2 = UUID.randomUUID();

        Product p1 = product("Wireless Headphones", "Electronics", new BigDecimal("49.99"));
        p1.setId(id1);
        Product p2 = product("Budget Headphones", "Electronics", new BigDecimal("19.99"));
        p2.setId(id2);

        ProductDocument doc1 = new ProductDocument();
        doc1.setId(id1.toString());
        ProductDocument doc2 = new ProductDocument();
        doc2.setId(id2.toString());

        SearchHit<ProductDocument> hit1 = mock(SearchHit.class);
        when(hit1.getContent()).thenReturn(doc1);
        SearchHit<ProductDocument> hit2 = mock(SearchHit.class);
        when(hit2.getContent()).thenReturn(doc2);

        SearchHits<ProductDocument> hits = mock(SearchHits.class);
        // ES returns id1 first (higher score)
        when(hits.stream()).thenReturn(Stream.of(hit1, hit2));
        when(hits.getTotalHits()).thenReturn(2L);

        doReturn(hits).when(elasticsearchOperations).search(any(NativeQuery.class), eq(ProductDocument.class));
        // Postgres returns them in different order
        when(productRepository.findAllById(any())).thenReturn(List.of(p2, p1));

        var result = productService.search(new ProductFilter("headphones", null, null, null), PageRequest.of(0, 20));

        assertThat(result.getContent()).hasSize(2);
        // Should preserve ES order: p1 first
        assertThat(result.getContent().get(0).getId()).isEqualTo(id1);
        assertThat(result.getContent().get(1).getId()).isEqualTo(id2);
    }

    private Product product(String name, String category, BigDecimal price) {
        Product p = new Product();
        p.setName(name);
        p.setCategory(category);
        p.setPrice(price);
        return p;
    }
}
