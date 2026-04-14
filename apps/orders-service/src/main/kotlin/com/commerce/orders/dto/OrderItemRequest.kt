package com.commerce.orders.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Positive
import java.math.BigDecimal
import java.util.UUID

data class OrderItemRequest(
    @field:NotNull
    val productId: UUID?,

    @field:NotBlank
    val productName: String?,

    @field:NotNull
    @field:Positive
    val price: BigDecimal?,

    @field:NotNull
    @field:Positive
    val quantity: Int?
)
