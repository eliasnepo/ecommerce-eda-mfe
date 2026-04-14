package com.commerce.orders.event

import com.commerce.orders.domain.Order
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class OrderCreatedEvent(
    val eventId: UUID,
    val orderId: UUID,
    val userId: Long,
    val total: BigDecimal,
    val items: List<OrderCreatedItem>,
    val createdAt: Instant
) {
    companion object {
        fun from(order: Order): OrderCreatedEvent = OrderCreatedEvent(
            eventId = UUID.randomUUID(),
            orderId = order.id!!,
            userId = order.userId,
            total = order.total,
            items = order.items.map { item ->
                OrderCreatedItem(
                    productId = item.productId,
                    productName = item.productName,
                    unitPrice = item.unitPrice,
                    quantity = item.quantity
                )
            },
            createdAt = order.createdAt!!
        )
    }
}

data class OrderCreatedItem(
    val productId: UUID,
    val productName: String,
    val unitPrice: BigDecimal,
    val quantity: Int
)
