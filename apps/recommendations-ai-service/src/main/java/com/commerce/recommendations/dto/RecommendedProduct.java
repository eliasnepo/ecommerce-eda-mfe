package com.commerce.recommendations.dto;

public record RecommendedProduct(
        String productName,
        String category,
        String reason
) {
}
