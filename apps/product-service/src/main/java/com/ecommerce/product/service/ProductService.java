package com.ecommerce.product.service;

import co.elastic.clients.elasticsearch._types.query_dsl.BoolQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.MultiMatchQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.RangeQuery;
import co.elastic.clients.elasticsearch._types.query_dsl.TermQuery;
import co.elastic.clients.json.JsonData;
import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.search.ProductDocument;
import com.ecommerce.product.search.ProductIndexingService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.client.elc.NativeQuery;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductIndexingService indexingService;
    private final ElasticsearchOperations elasticsearchOperations;

    public ProductService(ProductRepository productRepository,
                          ProductIndexingService indexingService,
                          ElasticsearchOperations elasticsearchOperations) {
        this.productRepository = productRepository;
        this.indexingService = indexingService;
        this.elasticsearchOperations = elasticsearchOperations;
    }

    public Product save(Product product) {
        Product saved = productRepository.save(product);
        indexingService.index(saved);
        return saved;
    }

    @Transactional(readOnly = true)
    public Optional<Product> findById(UUID id) {
        return productRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Page<Product> search(ProductFilter filter, Pageable pageable) {
        NativeQuery query = buildQuery(filter, pageable);
        SearchHits<ProductDocument> hits =
                elasticsearchOperations.search(query, ProductDocument.class);

        List<UUID> ids = hits.stream()
                .map(h -> UUID.fromString(h.getContent().getId()))
                .toList();

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
