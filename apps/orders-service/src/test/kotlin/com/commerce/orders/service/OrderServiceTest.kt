package com.commerce.orders.service

import com.commerce.orders.domain.Order
import com.commerce.orders.dto.CreateOrderRequest
import com.commerce.orders.dto.OrderItemRequest
import com.commerce.orders.event.OrderCreatedEvent
import com.commerce.orders.event.OrderEventPublisher
import com.commerce.orders.repository.OrderRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.InjectMocks
import org.mockito.Mock
import org.mockito.junit.jupiter.MockitoExtension
import org.mockito.kotlin.any
import org.mockito.kotlin.argumentCaptor
import org.mockito.kotlin.doAnswer
import org.mockito.kotlin.times
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@ExtendWith(MockitoExtension::class)
class OrderServiceTest {

    @Mock
    private lateinit var orderRepository: OrderRepository

    @Mock
    private lateinit var eventPublisher: OrderEventPublisher

    @InjectMocks
    private lateinit var orderService: OrderService

    @Test
    fun `placeOrder computes total from items`() {
        val orderId = UUID.randomUUID()
        val createdAt = Instant.parse("2026-04-13T10:00:00Z")

        whenever(orderRepository.save(any<Order>())).thenAnswer { invocation ->
            val toSave = invocation.getArgument<Order>(0)
            toSave.id = orderId
            toSave.createdAt = createdAt
            toSave
        }

        val response = orderService.placeOrder(
            CreateOrderRequest(
                userId = 1,
                items = listOf(
                    OrderItemRequest(
                        productId = UUID.randomUUID(),
                        productName = "Keyboard",
                        price = BigDecimal("10.50"),
                        quantity = 2
                    ),
                    OrderItemRequest(
                        productId = UUID.randomUUID(),
                        productName = "Mouse",
                        price = BigDecimal("3.25"),
                        quantity = 3
                    )
                )
            )
        )

        assertEquals(orderId, response.orderId)
        assertEquals(0, response.total.compareTo(BigDecimal("30.75")))
    }

    @Test
    fun `placeOrder publishes one order created event with matching order id`() {
        val orderId = UUID.randomUUID()
        val createdAt = Instant.parse("2026-04-13T10:00:00Z")

        whenever(orderRepository.save(any<Order>())).thenAnswer { invocation ->
            val toSave = invocation.getArgument<Order>(0)
            toSave.id = orderId
            toSave.createdAt = createdAt
            toSave
        }
        doAnswer { _ ->
            null
        }.whenever(eventPublisher).publish(any())

        orderService.placeOrder(
            CreateOrderRequest(
                userId = 1,
                items = listOf(
                    OrderItemRequest(
                        productId = UUID.randomUUID(),
                        productName = "Headphones",
                        price = BigDecimal("49.99"),
                        quantity = 1
                    )
                )
            )
        )

        val eventCaptor = argumentCaptor<OrderCreatedEvent>()
        verify(eventPublisher, times(1)).publish(eventCaptor.capture())
        assertNotNull(eventCaptor.firstValue)
        assertEquals(orderId, eventCaptor.firstValue.orderId)
    }

    @Test
    fun `findById throws when order is missing`() {
        val missingId = UUID.randomUUID()
        whenever(orderRepository.findWithItemsById(missingId)).thenReturn(null)

        assertThrows(OrderNotFoundException::class.java) {
            orderService.findById(missingId)
        }
    }
}
