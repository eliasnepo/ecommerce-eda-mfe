package com.commerce.orders.controller

import com.commerce.orders.domain.OrderStatus
import com.commerce.orders.dto.OrderItemResponse
import com.commerce.orders.dto.OrderResponse
import com.commerce.orders.service.OrderNotFoundException
import com.commerce.orders.service.OrderService
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.header
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@WebMvcTest(OrderController::class)
@Import(GlobalExceptionHandler::class)
class OrderControllerTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @MockitoBean
    private lateinit var orderService: OrderService

    @Test
    fun `post orders returns created with location header`() {
        val orderId = UUID.randomUUID()

        whenever(orderService.placeOrder(any())).thenReturn(
            OrderResponse(
                orderId = orderId,
                userId = 1,
                status = OrderStatus.PENDING,
                total = BigDecimal("129.99"),
                items = listOf(
                    OrderItemResponse(
                        productId = UUID.randomUUID(),
                        productName = "Wireless Headphones",
                        unitPrice = BigDecimal("129.99"),
                        quantity = 1
                    )
                ),
                createdAt = Instant.parse("2026-04-13T10:00:00Z")
            )
        )

        val body = """
            {
              "userId": 1,
              "items": [
                {
                  "productId": "${UUID.randomUUID()}",
                  "productName": "Wireless Headphones",
                  "price": 129.99,
                  "quantity": 1
                }
              ]
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isCreated)
            .andExpect(header().string("Location", "/api/orders/$orderId"))
            .andExpect(jsonPath("$.orderId").value(orderId.toString()))
    }

    @Test
    fun `post orders missing user id returns validation failed`() {
        val body = """
            {
              "items": [
                {
                  "productId": "${UUID.randomUUID()}",
                  "productName": "Wireless Headphones",
                  "price": 129.99,
                  "quantity": 1
                }
              ]
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
    }

    @Test
    fun `post orders empty items returns validation failed`() {
        val body = """
            {
              "userId": 1,
              "items": []
            }
        """.trimIndent()

        mockMvc.perform(
            post("/api/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("VALIDATION_FAILED"))
    }

    @Test
    fun `get order unknown id returns not found`() {
        val id = UUID.randomUUID()
        whenever(orderService.findById(id)).thenThrow(OrderNotFoundException(id))

        mockMvc.perform(get("/api/orders/$id"))
            .andExpect(status().isNotFound)
            .andExpect(jsonPath("$.error").value("NOT_FOUND"))
    }
}
