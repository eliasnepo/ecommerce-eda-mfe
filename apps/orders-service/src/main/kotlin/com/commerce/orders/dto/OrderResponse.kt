package com.commerce.orders.dto

import com.commerce.orders.domain.Order
import com.commerce.orders.domain.OrderStatus
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

data class OrderResponse(
    val orderId: UUID,
    val userId: Long,
    val status: OrderStatus,
    val total: BigDecimal,
    val items: List<OrderItemResponse>,
    val createdAt: Instant
) {
    companion object {
        fun from(order: Order): OrderResponse = OrderResponse(
            orderId = order.id!!,
            userId = order.userId,
            status = order.status,
            total = order.total,
            items = order.items.map(OrderItemResponse::from),
            createdAt = order.createdAt!!
        )
    }
}
