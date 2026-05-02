package com.commerce.recommendations.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderCreatedItem(
        UUID productId,
        String productName,
        BigDecimal unitPrice,
        Integer quantity
) {
}
