package com.commerce.recommendations.consumer;

import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.service.OrderHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderEventConsumer {

    private final OrderHistoryService orderHistoryService;

    @KafkaListener(topics = "order.created", groupId = "${spring.kafka.consumer.group-id}")
    public void onOrderCreated(OrderCreatedEvent event) {
        log.info("Received order event: eventId={}, userId={}", event.eventId(), event.userId());
        orderHistoryService.recordOrder(event);
    }
}
