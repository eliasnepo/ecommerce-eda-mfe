package com.commerce.recommendations.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record OrderCreatedEvent(
        UUID eventId,
        UUID orderId,
        Long userId,
        BigDecimal total,
        List<OrderCreatedItem> items,
        Instant createdAt
) {
}
