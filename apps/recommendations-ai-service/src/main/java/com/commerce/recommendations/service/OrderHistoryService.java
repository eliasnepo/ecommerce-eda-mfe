package com.commerce.recommendations.service;

import com.commerce.recommendations.domain.UserOrder;
import com.commerce.recommendations.domain.UserOrderItem;
import com.commerce.recommendations.dto.OrderCreatedEvent;
import com.commerce.recommendations.repository.UserOrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderHistoryService {

    private final UserOrderRepository userOrderRepository;

    @Transactional
    public void recordOrder(OrderCreatedEvent event) {
        if (userOrderRepository.findByEventId(event.eventId()).isPresent()) {
            log.debug("Skipping duplicate event: eventId={}", event.eventId());
            return;
        }

        UserOrder order = new UserOrder();
        order.setEventId(event.eventId());
        order.setUserId(event.userId());
        order.setTotal(event.total());
        order.setOrderedAt(event.createdAt());

        event.items().forEach(eventItem -> {
            UserOrderItem item = new UserOrderItem();
            item.setProductId(eventItem.productId());
            item.setProductName(eventItem.productName());
            item.setUnitPrice(eventItem.unitPrice());
            item.setQuantity(eventItem.quantity());
            order.addItem(item);
        });

        userOrderRepository.save(order);
        log.info("Recorded order history: userId={}, eventId={}", event.userId(), event.eventId());
    }
}
