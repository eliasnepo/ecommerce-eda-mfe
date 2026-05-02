package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.dto.OrderCreatedItem;
import com.commerce.recommendations.repository.UserOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OrderHistoryServiceTest {

    @Mock
    private UserOrderRepository userOrderRepository;

    @InjectMocks
    private OrderHistoryService orderHistoryService;

    @Test
    void recordOrder_savesNewEvent() {
        UUID eventId = UUID.randomUUID();
        OrderCreatedEvent event = new OrderCreatedEvent(
                eventId, UUID.randomUUID(), 1L, new BigDecimal("49.99"),
                List.of(new OrderCreatedItem(UUID.randomUUID(), "Headphones", new BigDecimal("49.99"), 1)),
                Instant.now()
        );
        when(userOrderRepository.findByEventId(eventId)).thenReturn(Optional.empty());

        orderHistoryService.recordOrder(event);

        ArgumentCaptor<UserOrder> captor = ArgumentCaptor.forClass(UserOrder.class);
        verify(userOrderRepository).save(captor.capture());
        UserOrder saved = captor.getValue();
        assertThat(saved.getEventId()).isEqualTo(eventId);
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getItems()).hasSize(1);
        assertThat(saved.getItems().get(0).getProductName()).isEqualTo("Headphones");
    }

    @Test
    void recordOrder_skipsOnDuplicateEventId() {
        UUID eventId = UUID.randomUUID();
        OrderCreatedEvent event = new OrderCreatedEvent(
                eventId, UUID.randomUUID(), 1L, new BigDecimal("49.99"),
                List.of(), Instant.now()
        );
        when(userOrderRepository.findByEventId(eventId)).thenReturn(Optional.of(new UserOrder()));

        orderHistoryService.recordOrder(event);

        verify(userOrderRepository, never()).save(any());
    }
}
