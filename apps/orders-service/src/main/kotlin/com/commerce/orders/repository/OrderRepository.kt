package com.commerce.orders.repository

import com.commerce.orders.domain.Order
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface OrderRepository : JpaRepository<Order, UUID> {

    @EntityGraph(attributePaths = ["items"])
    fun findWithItemsById(id: UUID): Order?

    @EntityGraph(attributePaths = ["items"])
    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<Order>
}
