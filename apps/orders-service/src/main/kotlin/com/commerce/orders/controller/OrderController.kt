package com.commerce.orders.controller

import com.commerce.orders.dto.CreateOrderRequest
import com.commerce.orders.dto.OrderResponse
import com.commerce.orders.service.OrderService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.net.URI
import java.util.UUID

@RestController
@RequestMapping("/api/orders")
class OrderController(
    private val orderService: OrderService
) {

    @PostMapping
    fun placeOrder(
        @Valid @RequestBody request: CreateOrderRequest
    ): ResponseEntity<OrderResponse> {
        val response = orderService.placeOrder(request)
        return ResponseEntity
            .created(URI.create("/api/orders/${response.orderId}"))
            .body(response)
    }

    @GetMapping("/{id}")
    fun getOrder(@PathVariable id: UUID): OrderResponse =
        orderService.findById(id)

    @GetMapping("/user/{userId}")
    fun listByUser(@PathVariable userId: Long): List<OrderResponse> =
        orderService.findByUserId(userId)
}
