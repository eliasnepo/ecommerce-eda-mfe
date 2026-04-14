package com.commerce.orders.dto

import com.commerce.orders.domain.OrderItem
import java.math.BigDecimal
import java.util.UUID

data class OrderItemResponse(
    val productId: UUID,
    val productName: String,
    val unitPrice: BigDecimal,
    val quantity: Int
) {
    companion object {
        fun from(item: OrderItem): OrderItemResponse = OrderItemResponse(
            productId = item.productId,
            productName = item.productName,
            unitPrice = item.unitPrice,
            quantity = item.quantity
        )
    }
}
