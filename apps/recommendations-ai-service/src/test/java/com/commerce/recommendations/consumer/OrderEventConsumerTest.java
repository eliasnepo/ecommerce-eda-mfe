package com.commerce.recommendations.consumer;

import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.dto.OrderCreatedItem;
import com.commerce.recommendations.service.OrderHistoryService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderEventConsumerTest {

    @Mock
    private OrderHistoryService orderHistoryService;

    @InjectMocks
    private OrderEventConsumer consumer;

    @Test
    void onOrderCreated_delegatesToOrderHistoryService() {
        OrderCreatedEvent event = new OrderCreatedEvent(
                UUID.randomUUID(), UUID.randomUUID(), 1L, new BigDecimal("49.99"),
                List.of(new OrderCreatedItem(UUID.randomUUID(), "Keyboard", new BigDecimal("49.99"), 1)),
                Instant.now()
        );

        consumer.onOrderCreated(event);

        verify(orderHistoryService).recordOrder(event);
    }
}
