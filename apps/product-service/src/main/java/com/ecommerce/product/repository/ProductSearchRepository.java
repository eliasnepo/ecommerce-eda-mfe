package com.ecommerce.product.repository;

import com.ecommerce.product.search.ProductDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;

public interface ProductSearchRepository extends ElasticsearchRepository<ProductDocument, String> {

    Page<ProductDocument> findByCategoryAndPriceBetween(
            String category, Double minPrice, Double maxPrice, Pageable pageable);
}
