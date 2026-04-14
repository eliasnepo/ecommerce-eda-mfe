package com.commerce.orders.dto

import jakarta.validation.Valid
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive

data class CreateOrderRequest(
    @field:NotNull
    @field:Positive
    val userId: Long?,

    @field:NotEmpty
    @field:Valid
    val items: List<OrderItemRequest> = emptyList()
)
