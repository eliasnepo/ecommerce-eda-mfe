package com.ecommerce.product.controller;

import com.ecommerce.product.domain.Product;
import com.ecommerce.product.service.ProductFilter;
import com.ecommerce.product.service.ProductService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

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
