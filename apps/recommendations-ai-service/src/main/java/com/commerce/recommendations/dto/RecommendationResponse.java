package com.commerce.recommendations.dto;

import java.util.List;

public record RecommendationResponse(
        Long userId,
        int historyOrdersUsed,
        String insights,
        List<RecommendedProduct> recommendations
) {
}
