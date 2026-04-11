package com.ecommerce.product.controller;

import com.ecommerce.product.domain.Product;

import java.util.List;

public record ProductPage(
        List<Product> content,
        long totalElements,
        int totalPages,
        int currentPage
) {}
