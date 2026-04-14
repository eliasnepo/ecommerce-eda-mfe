package com.commerce.orders.service

import com.commerce.orders.domain.Order
import com.commerce.orders.domain.OrderItem
import com.commerce.orders.domain.OrderStatus
import com.commerce.orders.dto.CreateOrderRequest
import com.commerce.orders.dto.OrderResponse
import com.commerce.orders.event.OrderCreatedEvent
import com.commerce.orders.event.OrderEventPublisher
import com.commerce.orders.repository.OrderRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.util.UUID

class OrderNotFoundException(id: UUID) : RuntimeException("Order $id not found")

@Service
@Transactional
class OrderService(
    private val orderRepository: OrderRepository,
    private val eventPublisher: OrderEventPublisher
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun placeOrder(request: CreateOrderRequest): OrderResponse {
        val order = Order(
            userId = request.userId!!,
            status = OrderStatus.PENDING,
            total = BigDecimal.ZERO
        )

        request.items.forEach { itemReq ->
            order.addItem(
                OrderItem(
                    productId = itemReq.productId!!,
                    productName = itemReq.productName!!,
                    unitPrice = itemReq.price!!,
                    quantity = itemReq.quantity!!
                )
            )
        }

        order.total = order.items
            .map { it.unitPrice.multiply(BigDecimal.valueOf(it.quantity.toLong())) }
            .fold(BigDecimal.ZERO, BigDecimal::add)

        val saved = orderRepository.save(order)
        log.debug("Persisted order {} for user {}", saved.id, saved.userId)

        eventPublisher.publish(OrderCreatedEvent.from(saved))
        return OrderResponse.from(saved)
    }

    @Transactional(readOnly = true)
    fun findById(id: UUID): OrderResponse {
        val order = orderRepository.findWithItemsById(id)
            ?: throw OrderNotFoundException(id)
        return OrderResponse.from(order)
    }

    @Transactional(readOnly = true)
    fun findByUserId(userId: Long): List<OrderResponse> =
        orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId)
            .map(OrderResponse::from)
}
