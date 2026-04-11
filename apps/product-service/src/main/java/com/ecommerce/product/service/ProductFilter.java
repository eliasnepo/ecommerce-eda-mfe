package com.ecommerce.product.service;

public record ProductFilter(
        String query,
        String category,
        Double minPrice,
        Double maxPrice
) {}
