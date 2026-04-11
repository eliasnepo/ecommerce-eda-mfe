package com.ecommerce.product.search;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.repository.ProductSearchRepository;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class ProductIndexingService {

    private final ProductSearchRepository searchRepository;

    public ProductIndexingService(ProductSearchRepository searchRepository) {
        this.searchRepository = searchRepository;
    }

    public void index(Product product) {
        searchRepository.save(ProductDocument.from(product));
    }

    public void delete(UUID productId) {
        searchRepository.deleteById(productId.toString());
    }
}
